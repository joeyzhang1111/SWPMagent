let cachedPayload = null;

// Kept for the browser session so leaving and re-entering the page does not re-download the large payload.
export async function fetchTasks({ signal, refresh = false } = {}) {
  if (cachedPayload && !refresh) return cachedPayload;
  const query = refresh ? '?refresh=true' : '';
  const response = await fetch(`/api/tasks${query}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
    signal,
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.detail || (response.status >= 500
      ? 'Task backend is unavailable. Restart npm run dev to start both the API and the frontend.'
      : `Task API request failed (${response.status})`);
    throw new Error(message);
  }

  if (!payload || !Array.isArray(payload.tasks)) {
    throw new Error('Task API returned an invalid response');
  }

  cachedPayload = {
    tasks: payload.tasks,
    traceability: Array.isArray(payload.traceability) ? payload.traceability : [],
    meta: payload.meta || {},
  };
  return cachedPayload;
}
