import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Content-Security-Policy voor de gebouwde app (npm run build).
// Laat alleen scripts van de app zelf toe en praat alleen met jouw Supabase-project.
// Niet in dev, omdat Vite daar inline scripts nodig heeft.
function csp(supabaseUrl) {
  const api = supabaseUrl ? new URL(supabaseUrl).origin : '';
  const ws = api.replace(/^https:/, 'wss:');
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' blob: data:",
    `connect-src 'self' ${api} ${ws}`.trim(),
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
  ].join('; ');
  return {
    name: 'kluis-csp',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), csp(env.VITE_SUPABASE_URL)],
    // Alleen op deze computer bereikbaar (niet voor anderen op je wifi).
    server: { host: '127.0.0.1', port: 5173, open: true },
    preview: { host: '127.0.0.1' },
    build: { sourcemap: false },
  };
});
