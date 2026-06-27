import { vi, describe, it, expect, afterEach } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getProjectRootDir', () => {
  it('returns two levels up from src/utils in non-production mode', async () => {
    vi.stubEnv('MODE', 'test');
    const { getProjectRootDir } = await import('./directories');
    const root = getProjectRootDir();
    expect(path.isAbsolute(root)).toBe(true);
    expect(root).toMatch(/ECRSWebsite[\\/]?$/);
  });

  it('returns one level up in production mode', async () => {
    vi.stubEnv('MODE', 'production');
    // Re-import to pick up stubbed env — directories.ts reads MODE at call time
    const { getProjectRootDir } = await import('./directories');
    const root = getProjectRootDir();
    expect(path.isAbsolute(root)).toBe(true);
    // production path is __dirname/../ (one level up from src/utils)
    expect(root).toMatch(/src[\\/]?$/);
  });
});

describe('getRelativeUrlByFilePath', () => {
  it('strips the src folder prefix from a real project path', async () => {
    const { getRelativeUrlByFilePath } = await import('./directories');
    // __dirname is src/utils/ — construct a real absolute path inside src/
    const absolutePath = path.join(__dirname, 'blog.ts');
    const result = getRelativeUrlByFilePath(absolutePath);
    expect(result).toBe('/utils/blog.ts');
  });
});
