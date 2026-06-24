import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: '/',
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/ha': {
          target: env.VITE_HA_URL || 'http://Nigel-Pi.local:8123',
          rewrite: (path) => path.replace(/^\/ha/, ''),
          changeOrigin: true,
          headers: {
            // Auth header added here (server-side) so the token is never baked into the JS bundle
            Authorization: `Bearer ${env.VITE_HA_TOKEN ?? ''}`,
          },
        },
      },
    },
  }
})
