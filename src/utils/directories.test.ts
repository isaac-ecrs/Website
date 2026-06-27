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
    // __dirname is <root>/src/utils — two levels up should equal <root>
    const expected = path.resolve(__dirname, '../..');
    expect(root.replace(/[/\\]+$/, '')).toBe(expected);
  });

  it('returns one level up from src/utils in production mode', async () => {
    vi.stubEnv('MODE', 'production');
    const { getProjectRootDir } = await import('./directories');
    const root = getProjectRootDir();
    // production: __dirname/../ = <root>/src
    const expected = path.resolve(__dirname, '..');
    expect(root.replace(/[/\\]+$/, '')).toBe(expected);
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
