import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function apiDevMiddleware(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/')) {
          const urlPath = req.url.split('?')[0].replace('/api/', '');
          try {
            // Dynamically import handler from /api/<endpoint>.js
            const module = await server.ssrLoadModule(`/api/${urlPath}.js`);
            const handler = module.default;
            if (typeof handler === 'function') {
              // Parse JSON body if present
              let body = {};
              if (req.method === 'POST') {
                const buffers: Uint8Array[] = [];
                for await (const chunk of req) {
                  buffers.push(chunk);
                }
                const rawBody = Buffer.concat(buffers).toString();
                try {
                  body = JSON.parse(rawBody);
                } catch {
                  body = {};
                }
              }

              // Mock response object compatible with Vercel serverless functions
              const mockReq = { ...req, body };
              const mockRes = {
                status(statusCode: number) {
                  res.statusCode = statusCode;
                  return this;
                },
                json(data: any) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                  return this;
                },
                setHeader(name: string, value: any) {
                  res.setHeader(name, value);
                  return this;
                },
                end(chunk?: any) {
                  res.end(chunk);
                  return this;
                },
              };

              await handler(mockReq, mockRes);
              return;
            }
          } catch (e: any) {
            console.error(`Local API handler error for ${req.url}:`, e);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: e?.message || 'Local API Error' }));
            return;
          }
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    apiDevMiddleware(),
    react(),
    tailwindcss(),
  ],
});
