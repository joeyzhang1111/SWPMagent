import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchAnalysisBootstrap,
  fetchAnalysisInputs,
  fetchAnalysisJob,
  fetchCachedBuilds,
  fetchJenkinsStatus,
  loadAlmChildren,
  startAnalysis,
  triggerJenkinsBuild,
} from '../API/analysis.js';

const STORAGE_KEY = 'swpm-analysis-session-v1';

export const EMPTY_SELECTION = {
  asFileNames: [], asFeatures: [], xsFileNames: [], xsFeatures: [], almScopes: [], qcPaths: [],
};

const AnalysisContext = createContext(null);

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

function normalizeSelection(selection, inputs) {
  const next = { ...EMPTY_SELECTION, ...(selection || {}) };
  const allowed = {
    asFileNames: new Set(inputs.asFiles || []),
    asFeatures: new Set(inputs.asFeatures || []),
    xsFileNames: new Set(inputs.xsFiles || []),
    xsFeatures: new Set(inputs.xsFeatures || []),
    almScopes: new Set((inputs.almScopes || []).map((scope) => scope.display)),
    qcPaths: new Set(inputs.qcPaths || []),
  };
  return Object.fromEntries(Object.entries(next).map(([key, values]) => [key, (values || []).filter((value) => allowed[key]?.has(value))]));
}

function sameRequest(a, b) {
  if (!a || !b) return true;
  if (a.project !== b.project || a.build !== b.build) return false;
  return Object.keys(EMPTY_SELECTION).every((key) => {
    const left = [...(a[key] || [])].sort();
    const right = [...(b[key] || [])].sort();
    return left.length === right.length && left.every((value, index) => value === right[index]);
  });
}

export function isJobRunning(job) {
  return job?.status === 'queued' || job?.status === 'running';
}

export function AnalysisProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState('');
  const [build, setBuild] = useState('');
  const [cachedBuilds, setCachedBuilds] = useState([]);
  const [inputs, setInputs] = useState(null);
  const [selection, setSelection] = useState(EMPTY_SELECTION);
  const [inputLoading, setInputLoading] = useState(false);
  const [error, setError] = useState('');
  const [jenkins, setJenkins] = useState(null);
  const [jobId, setJobId] = useState('');
  const [job, setJob] = useState(null);
  const [result, setResult] = useState(null);
  const [resultJobId, setResultJobId] = useState('');
  const [resultRequest, setResultRequest] = useState(null);
  const [expandingScope, setExpandingScope] = useState('');
  const [childlessScopes, setChildlessScopes] = useState(() => new Set());
  const initStarted = useRef(false);
  const projectSwitch = useRef(0);
  const selectionOwner = useRef('');

  const changeBuild = useCallback((value) => {
    setBuild(value);
    setInputs((current) => (current && current.build === value ? current : null));
  }, []);

  const fetchInputsFor = useCallback(async (nextProject, nextBuild, { refresh = false, baseSelection = null } = {}) => {
    const ticket = projectSwitch.current;
    setInputLoading(true);
    setError('');
    try {
      const data = await fetchAnalysisInputs(nextProject, nextBuild, { refresh });
      if (ticket !== projectSwitch.current) return null;
      setInputs(data);
      setSelection(normalizeSelection(baseSelection || data.selection, data));
      selectionOwner.current = nextProject;
      return data;
    } catch (requestError) {
      if (ticket === projectSwitch.current) setError(requestError.message);
      return null;
    } finally {
      setInputLoading(false);
    }
  }, []);

  const init = useCallback(() => {
    if (initStarted.current) return;
    initStarted.current = true;
    (async () => {
      try {
        const boot = await fetchAnalysisBootstrap();
        const saved = readSession();
        const useSaved = Boolean(saved?.project) && (boot.projects || []).includes(saved.project);
        const nextProject = useSaved ? saved.project : boot.lastProject || '';
        const nextBuild = useSaved ? saved.build || '' : boot.lastBuild || '';
        setProjects(boot.projects || []);
        setProject(nextProject);
        setBuild(nextBuild);
        if (useSaved) {
          try {
            setCachedBuilds((await fetchCachedBuilds(nextProject)).builds || []);
          } catch {
            setCachedBuilds([]);
          }
        } else {
          setCachedBuilds(boot.cachedBuilds || []);
        }
        if (nextProject && nextBuild) {
          await fetchInputsFor(nextProject, nextBuild, { baseSelection: useSaved ? saved.selection : null });
        } else {
          setSelection({ ...EMPTY_SELECTION, ...(boot.selection || {}) });
        }
        if (boot.warning) setError((current) => current || boot.warning);

        if (saved?.resultJobId && saved.resultJobId !== saved.jobId) {
          try {
            const done = await fetchAnalysisJob(saved.resultJobId);
            if (done.status === 'complete' && done.kind === 'analysis') {
              setResult(done.result);
              setResultRequest(done.request);
              setResultJobId(done.id);
            }
          } catch {
            // The backend was restarted, so the stored result is gone.
          }
        }
        if (saved?.jobId) setJobId(saved.jobId);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setReady(true);
      }
    })();
  }, [fetchInputsFor]);

  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ project, build, selection, jobId, resultJobId }));
    } catch {
      // Storage can be unavailable (private mode); the in-memory state still works.
    }
  }, [ready, project, build, selection, jobId, resultJobId]);

  useEffect(() => {
    if (!jobId) return undefined;
    let stopped = false;
    let timer;
    const poll = async () => {
      try {
        const next = await fetchAnalysisJob(jobId);
        if (stopped) return;
        setJob(next);
        if (next.status === 'complete') {
          if (next.kind === 'analysis') {
            setResult(next.result);
            setResultRequest(next.request);
            setResultJobId(next.id);
          }
          if (next.kind === 'jenkins' && next.result?.last_success_build) {
            changeBuild(String(next.result.last_success_build));
          }
          return;
        }
        if (next.status === 'failed') return;
        timer = setTimeout(poll, 1000);
      } catch (requestError) {
        if (stopped) return;
        if (/not found/i.test(requestError.message)) {
          setJobId('');
          setJob(null);
        } else {
          setError(requestError.message);
        }
      }
    };
    poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [jobId, changeBuild]);

  const changeProject = useCallback(async (nextProject) => {
    const ticket = ++projectSwitch.current;
    setProject(nextProject);
    setInputs(null);
    setSelection(EMPTY_SELECTION);
    selectionOwner.current = '';
    setJenkins(null);
    if (!nextProject) {
      setCachedBuilds([]);
      setBuild('');
      return;
    }
    try {
      const data = await fetchCachedBuilds(nextProject);
      if (ticket !== projectSwitch.current) return;
      setCachedBuilds(data.builds || []);
      setBuild(data.builds?.[0] || '');
    } catch (requestError) {
      if (ticket === projectSwitch.current) setError(requestError.message);
    }
  }, []);

  const loadInputs = useCallback(() => {
    if (!project || !build) return Promise.resolve(null);
    const alreadyLoaded = inputs?.project === project && inputs?.build === build;
    const hasSelection = Object.values(selection).some((values) => values.length > 0);
    const keep = selectionOwner.current === project && hasSelection ? selection : null;
    return fetchInputsFor(project, build, { refresh: alreadyLoaded, baseSelection: keep });
  }, [project, build, inputs, selection, fetchInputsFor]);

  const updateSelection = useCallback((key, values) => setSelection((current) => ({ ...current, [key]: values })), []);

  const run = useCallback(async () => {
    setError('');
    setResult(null);
    setResultRequest(null);
    setResultJobId('');
    try {
      const response = await startAnalysis({ project, build, ...selection });
      setJob(null);
      setJobId(response.jobId);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [project, build, selection]);

  const refreshJenkins = useCallback(async () => {
    setError('');
    try {
      const status = await fetchJenkinsStatus(project);
      setJenkins(status);
      if (status.last_success_build) changeBuild(String(status.last_success_build));
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [project, changeBuild]);

  const trigger = useCallback(async () => {
    setError('');
    try {
      const response = await triggerJenkinsBuild(project);
      setJob(null);
      setJobId(response.jobId);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [project]);

  const expandScope = useCallback(async (display) => {
    setError('');
    setExpandingScope(display);
    try {
      const data = await loadAlmChildren(display);
      if (data.loaded === 0) setChildlessScopes((current) => new Set(current).add(display));
      const available = new Set(data.almScopes.map((scope) => scope.display));
      setInputs((current) => ({ ...current, almScopes: data.almScopes }));
      setSelection((current) => ({ ...current, almScopes: current.almScopes.filter((item) => available.has(item)) }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setExpandingScope('');
    }
  }, []);

  const scopeOptions = useMemo(() => (inputs?.almScopes || []).map((scope) => scope.display), [inputs]);
  const expandableScopes = useMemo(
    () => new Set((inputs?.almScopes || []).filter((scope) => scope.expandable && !childlessScopes.has(scope.display)).map((scope) => scope.display)),
    [inputs, childlessScopes],
  );
  const resultStale = useMemo(
    () => Boolean(result) && !sameRequest(resultRequest, { project, build, ...selection }),
    [result, resultRequest, project, build, selection],
  );

  const value = {
    ready, init, projects, project, build, cachedBuilds, inputs, selection, inputLoading, error, jenkins,
    job, result, resultJobId, resultRequest, resultStale, expandingScope, scopeOptions, expandableScopes,
    canRun: Boolean(inputs) && !inputLoading && !isJobRunning(job),
    changeProject, changeBuild, loadInputs, updateSelection, run, refreshJenkins, trigger, expandScope,
  };

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  return useContext(AnalysisContext);
}
