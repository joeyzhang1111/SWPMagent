# Tasks API

By default this service reads the real ALM cache produced by the reference GUI. This immediately exposes the same `all_defects` records to the React page without copying credentials or duplicating business data.

It also reads the reference GUI's saved DOORS and QC selections and locates the latest matching Jenkins `*_ref` build. Selected `10_AS` and `40_Gen_SWXS` module CSV files become DOORS requirements. QC test instances are filtered by `qc_paths`; matching baseline requirements with `Requirement_Type=105` are loaded from `QC_Requirements.csv`. All records are normalized into the same `/api/tasks` response. Derived caches under `backend/.cache/` avoid reparsing the large exports until an input file or selection changes.

Cross-source traceability uses exported identifiers only: DOORS external `WorkItemID` values link to ALM work items, QC `RB_DoorsLinks` and `RB_Doors_Identifier` values link to DOORS objects, and `QC_Req2Test.csv` links QC requirements to tests. Title similarity is deliberately not used. Links whose target is outside the currently loaded scopes are returned as unresolved references instead of guessed matches.

Set these values in `backend/.env`:

```env
SWPM_TASK_DATA_MODE=legacy-cache
SWPM_LEGACY_ALM_CACHE=C:\path\to\python_Jenkins _door_QC_ALM_GUI\.app_cache\alm\alm_cache.json
SWPM_LEGACY_ALM_SCOPE=
SWPM_DOORS_ENABLED=true
SWPM_QC_ENABLED=true
SWPM_LEGACY_JENKINS_ROOT=C:\path\to\python_Jenkins _door_QC_ALM_GUI\.app_cache\jenkins
SWPM_LEGACY_CONFIG=C:\path\to\python_Jenkins _door_QC_ALM_GUI\.app_cache\config\config.json
```

Leave `SWPM_LEGACY_ALM_SCOPE` empty to combine all cached scopes, or set it to one exact cache scope.

The optional live mode keeps RTC/ALM credentials and session cookies out of the browser. It follows the reference GUI's read-only flow:

1. authenticate through `/ccm/authenticated/identity` and `/ccm/j_security_check`;
2. query the selected iteration through the RTC OSLC `workitems` endpoint;
3. resolve referenced work-item attributes and return normalized task records.

## Local setup

1. Set `SWPM_TASK_DATA_MODE=live` in `backend/.env`.
2. Set `RTC_ALM_USERNAME`, `RTC_ALM_PASSWORD`, and `RTC_ALM_ITERATION_ID`.
   The iteration ID is the last path segment of the iteration URL used by the reference GUI.
3. Keep `RTC_ALM_VERIFY_SSL=true`. If RTC uses an internal CA, set `RTC_ALM_CA_BUNDLE` to its PEM bundle. Use `false` only as a temporary local diagnostic.
4. Run `npm run dev` to start the API and React app together. Use `npm run backend` and `npm run dev:frontend` only when separate processes are needed.

The API caches a successful response for five minutes by default. The page's Refresh button calls `/api/tasks?refresh=true` to bypass the API and derived caches and re-read the local ALM/Jenkins export files. It does not trigger a new export from the remote ALM, DOORS, or QC servers.
