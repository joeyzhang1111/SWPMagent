async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    ...options,
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // The shared error below is clearer than a JSON parsing exception.
  }
  if (!response.ok) {
    throw new Error(payload?.detail || `Analysis API request failed (${response.status})`);
  }
  return payload;
}

export function fetchAnalysisBootstrap({ refreshProjects = false, signal } = {}) {
  return requestJson(`/api/analysis/bootstrap${refreshProjects ? '?refreshProjects=true' : ''}`, { signal });
}

export function fetchAnalysisInputs(project, build, { refresh = false, signal } = {}) {
  const query = new URLSearchParams({ project, build });
  if (refresh) query.set('refresh', 'true');
  return requestJson(`/api/analysis/inputs?${query}`, { signal });
}

export function fetchCachedBuilds(project, { signal } = {}) {
  const query = new URLSearchParams({ project });
  return requestJson(`/api/analysis/cached-builds?${query}`, { signal });
}

export function fetchJenkinsStatus(project, { signal } = {}) {
  const query = new URLSearchParams({ project });
  return requestJson(`/api/analysis/jenkins-status?${query}`, { signal });
}

export function triggerJenkinsBuild(project) {
  return requestJson('/api/analysis/trigger-build', {
    method: 'POST',
    body: JSON.stringify({ project }),
  });
}

export function loadAlmChildren(display) {
  return requestJson('/api/analysis/alm-children', {
    method: 'POST',
    body: JSON.stringify({ display }),
  });
}

export function startAnalysis(request) {
  return requestJson('/api/analysis/runs', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export function fetchAnalysisJob(jobId, { includeResult = true, signal } = {}) {
  return requestJson(`/api/analysis/runs/${encodeURIComponent(jobId)}?includeResult=${includeResult}`, { signal });
}

export function reportUrl(jobId) {
  return `/api/analysis/runs/${encodeURIComponent(jobId)}/report`;
}
