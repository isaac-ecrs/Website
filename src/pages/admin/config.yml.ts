import type { APIRoute } from 'astro';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export const GET: APIRoute = () => {
  const configPath = resolve('./public/admin/config.yml');
  const configContent = readFileSync(configPath, 'utf-8');

  return new Response(configContent, {
    headers: {
      'Content-Type': 'text/yaml',
    },
  });
};
