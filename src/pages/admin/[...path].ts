/* eslint-disable no-undef */
import type { APIRoute } from 'astro';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export const prerender = false;

export const GET: APIRoute = ({ params }) => {
  const path = params.path || 'index.html';

  try {
    // Map the request path to files in public/admin/
    let filePath: string;

    if (path === '' || path === '/') {
      filePath = 'index.html';
    } else {
      filePath = path;
    }

    const fullPath = resolve(`./public/admin/${filePath}`);
    const content = readFileSync(fullPath, 'utf-8');

    // Determine content type based on file extension
    const contentType = filePath.endsWith('.yml')
      ? 'text/yaml; charset=utf-8'
      : filePath.endsWith('.html')
        ? 'text/html; charset=utf-8'
        : 'text/plain';

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error(`Failed to load /admin/${path}:`, error);
    return new Response('Not found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
};
