import { describe, expect, it, vi } from 'vitest';
import {
  LTI_LEARNER_STORAGE_KEY,
  consumeLtiLaunchFromLocation,
  persistLtiLearnerId,
  readLtiLaunchFromSearch,
  resolveLaunchCourseId,
} from './ltiLaunch';

describe('readLtiLaunchFromSearch', () => {
  it('reads courseId and ltiLearnerId from redirect query', () => {
    expect(
      readLtiLaunchFromSearch(
        '?courseId=cs50p-2022-lecture-0&ltiLearnerId=learner-abc',
      ),
    ).toEqual({
      courseId: 'cs50p-2022-lecture-0',
      ltiLearnerId: 'learner-abc',
    });
  });

  it('returns nulls when params missing', () => {
    expect(readLtiLaunchFromSearch('')).toEqual({
      courseId: null,
      ltiLearnerId: null,
    });
  });
});

describe('persistLtiLearnerId', () => {
  it('writes learner id to session storage', () => {
    const map = new Map<string, string>();
    persistLtiLearnerId('learner-1', {
      setItem: (k, v) => {
        map.set(k, v);
      },
    });
    expect(map.get(LTI_LEARNER_STORAGE_KEY)).toBe('learner-1');
  });
});

describe('consumeLtiLaunchFromLocation', () => {
  it('persists learner and strips query via replaceState', () => {
    const map = new Map<string, string>();
    const replaceState = vi.fn();
    const launch = consumeLtiLaunchFromLocation(
      {
        search: '?courseId=cs50p-2022-lecture-0&ltiLearnerId=learner-xyz',
        pathname: '/',
        hash: '',
      },
      { replaceState },
      {
        setItem: (k, v) => {
          map.set(k, v);
        },
      },
    );
    expect(launch).toEqual({
      courseId: 'cs50p-2022-lecture-0',
      ltiLearnerId: 'learner-xyz',
    });
    expect(map.get(LTI_LEARNER_STORAGE_KEY)).toBe('learner-xyz');
    expect(replaceState).toHaveBeenCalledWith(null, '', '/');
  });
});

describe('resolveLaunchCourseId', () => {
  it('uses launch courseId when it matches known course', () => {
    expect(
      resolveLaunchCourseId('cs50p-2022-lecture-0', 'cs50p-2022-lecture-0'),
    ).toBe('cs50p-2022-lecture-0');
  });

  it('falls back when unknown', () => {
    expect(resolveLaunchCourseId('other', 'cs50p-2022-lecture-0')).toBe(
      'cs50p-2022-lecture-0',
    );
  });
});
