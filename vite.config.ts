import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// App build/dev config. Tests use vitest.config.ts (separate, node env).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
