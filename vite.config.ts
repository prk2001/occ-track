import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'plugin-inspect-react-code'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
    // Allow the dev server to be reached through Cloudflare quick tunnels
    // (any *.trycloudflare.com URL) and any LAN host. Without this, Vite
    // rejects requests with non-localhost Host headers as a security
    // default — which blocks the tunnel preview entirely.
    allowedHosts: ['.trycloudflare.com', '.loca.lt', '.ngrok-free.app', '.lhr.life'],
    host: '0.0.0.0',
    // HMR over the tunnel needs the wss:// version of the public URL.
    // Setting clientPort=443 tells the in-page HMR client to connect via
    // the tunnel's HTTPS port; the tunnel translates back to dev server.
    hmr: {
      clientPort: 443,
      protocol: 'wss',
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
