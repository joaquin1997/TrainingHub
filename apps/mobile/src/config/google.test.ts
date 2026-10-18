import { describe, expect, it } from 'vitest';

import { googleClientIdFor, googleIosRedirectUri } from './google';

describe('Google client ids (spec 0039)', () => {
  const ids = { ios: '123-abc.apps.googleusercontent.com', web: 'web-id' };

  it('picks the id for the platform, none on Android (FR-1, AC-1)', () => {
    expect(googleClientIdFor('ios', ids)).toBe(ids.ios);
    expect(googleClientIdFor('web', ids)).toBe('web-id');
    expect(googleClientIdFor('android', ids)).toBeUndefined();
    expect(googleClientIdFor('ios', {})).toBeUndefined();
  });

  it('builds the reversed-scheme redirect of an iOS client', () => {
    expect(googleIosRedirectUri(ids.ios)).toBe('com.googleusercontent.apps.123-abc:/oauthredirect');
  });
});
