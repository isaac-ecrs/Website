import type { APIRoute } from 'astro';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export const GET: APIRoute = ({ params }) => {
  const { rest } = params;

  // Handle config.yml requests
  if (rest === 'config.yml') {
    try {
      const configPath = resolve('./public/admin/config.yml');
      const configContent = readFileSync(configPath, 'utf-8');

      return new Response(configContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/yaml; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } catch (error) {
      console.error('Failed to load config:', error);
      return new Response('Config file not found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }
  }

  // Default response for other paths
  return new Response('Not found', { status: 404 });
};
