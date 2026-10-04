/** sessionStorage key for LTI learner id from launch redirect. */
export const LTI_LEARNER_STORAGE_KEY = 'unitutor:lti-learner';

export type LtiLaunchParams = {
  courseId: string | null;
  ltiLearnerId: string | null;
};

/** Parse ARCHITECTURE §2.7 redirect query: `courseId` + `ltiLearnerId`. */
export function readLtiLaunchFromSearch(search: string): LtiLaunchParams {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const q = new URLSearchParams(raw);
  const courseId = q.get('courseId')?.trim() || null;
  const ltiLearnerId = q.get('ltiLearnerId')?.trim() || null;
  return { courseId, ltiLearnerId };
}

export function persistLtiLearnerId(
  ltiLearnerId: string | null,
  storage: Pick<Storage, 'setItem'> = sessionStorage,
): void {
  if (!ltiLearnerId) return;
  storage.setItem(LTI_LEARNER_STORAGE_KEY, ltiLearnerId);
}

/**
 * Read launch query once, persist learner id, strip query from the address bar.
 * Safe when `window` is missing (SSR / tests without jsdom location).
 */
export function consumeLtiLaunchFromLocation(
  loc: Pick<Location, 'search' | 'pathname' | 'hash'> = window.location,
  historyApi: Pick<History, 'replaceState'> = window.history,
  storage: Pick<Storage, 'setItem'> = sessionStorage,
): LtiLaunchParams {
  const launch = readLtiLaunchFromSearch(loc.search);
  persistLtiLearnerId(launch.ltiLearnerId, storage);
  if (launch.courseId || launch.ltiLearnerId) {
    historyApi.replaceState(null, '', `${loc.pathname}${loc.hash}`);
  }
  return launch;
}

/**
 * Resolve active course for canvas. Unknown / missing → fallback (CS50P MVP).
 */
export function resolveLaunchCourseId(
  launchCourseId: string | null,
  knownCourseId: string,
): string {
  if (launchCourseId && launchCourseId === knownCourseId) return launchCourseId;
  return knownCourseId;
}
