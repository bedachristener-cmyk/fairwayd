import { isCorsOriginAllowed, shouldEnableSwagger } from './cors';

const ORIGINAL_ENV = process.env;

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.ALLOW_VERCEL_PREVIEWS;
  delete process.env.NODE_ENV;
}

describe('CORS origin policy', () => {
  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    resetEnv();
  });

  it('allows production Fairwayd web origins', () => {
    expect(isCorsOriginAllowed('https://www.fairwayd.golf')).toBe(true);
    expect(isCorsOriginAllowed('https://fairwayd.golf')).toBe(true);
  });

  it('preserves local and Stage origins', () => {
    expect(isCorsOriginAllowed('http://localhost:5173')).toBe(true);
    expect(isCorsOriginAllowed('http://127.0.0.1:5173')).toBe(true);
    expect(isCorsOriginAllowed('https://fairwayd.vercel.app')).toBe(true);
    expect(
      isCorsOriginAllowed(
        'https://fairwayd-git-stage-bedachristener-cmyks-projects.vercel.app',
      ),
    ).toBe(true);
  });

  it('allows Vercel previews by default and can disable them', () => {
    expect(isCorsOriginAllowed('https://preview-fairwayd.vercel.app')).toBe(
      true,
    );

    process.env.ALLOW_VERCEL_PREVIEWS = 'false';

    expect(isCorsOriginAllowed('https://preview-fairwayd.vercel.app')).toBe(
      false,
    );
  });

  it('rejects unrelated origins', () => {
    expect(isCorsOriginAllowed('https://example.com')).toBe(false);
  });
});

describe('Swagger exposure policy', () => {
  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    resetEnv();
  });

  it('is enabled outside production', () => {
    process.env.NODE_ENV = 'development';

    expect(shouldEnableSwagger()).toBe(true);
  });

  it('is disabled in production', () => {
    process.env.NODE_ENV = 'production';

    expect(shouldEnableSwagger()).toBe(false);
  });
});
