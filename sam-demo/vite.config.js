import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-cloudflare-static',
      closeBundle() {
        for (const f of ['_headers', '_redirects']) {
          const src = resolve(__dirname, f);
          if (existsSync(src)) copyFileSync(src, resolve(__dirname, 'dist', f));
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
