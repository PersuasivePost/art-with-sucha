// Force rebuild: 2025-10-19 13:20 UTC
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default ({ mode }: { mode: string }) => {
  // Load env variables so VITE_BACKEND_URL is available
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.VITE_BACKEND_URL || 'http://localhost:5000'

  return defineConfig({
    plugins: [react()],
    server: {
      proxy: {
        // Proxy dev requests to /api/github-image to the backend to avoid React Router catching them
        '/api/github-image': {
          target: backend,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/github-image/, '/api/github-image'),
          // increase timeout for large images
          timeout: 120000
        }
        ,
        // Proxy sections list and simple section-create paths to backend during dev to avoid CORS
        '/sections': {
          target: backend,
          changeOrigin: true,
          secure: false,
          timeout: 30000
        },
        '/create-section': {
          target: backend,
          changeOrigin: true,
          secure: false,
          timeout: 30000
        }
      }
    }
  })
}
