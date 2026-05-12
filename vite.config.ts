/// <reference types="vitest" />
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'plugin-inspect-react-code'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: false,
    // Exclude E2E specs — those use @playwright/test and incompatible runner.
    exclude: ['**/node_modules/**', '**/dist/**', 'src/test/e2e/**'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: [
        'src/main.tsx',
        'src/test/**',
        'node_modules/**',
        'dist/**',
        '**/*.config.*',
        '**/*.d.ts',
      ],
    },
  },
  server: {
    port: 3000,
    // Allow the dev server to be reached through Cloudflare quick tunnels
    // (any *.trycloudflare.com URL) and any LAN host. Without this, Vite
    // rejects requests with non-localhost Host headers as a security
    // default — which blocks the tunnel preview entirely.
    allowedHosts: ['.trycloudflare.com', '.loca.lt', '.ngrok-free.app', '.lhr.life'],
    host: '0.0.0.0',
    // HMR over a public tunnel needs `wss://` + clientPort 443 so the
    // in-page client connects through the tunnel's TLS port. For local
    // dev + tests, the default ws://localhost:3000 works fine.
    // Enable the tunnel-friendly HMR via `OCC_TUNNEL_HMR=1 npm run dev`.
    ...(process.env.OCC_TUNNEL_HMR
      ? { hmr: { clientPort: 443, protocol: 'wss' as const } }
      : {}),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
