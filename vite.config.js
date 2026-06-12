import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Local CORS proxy – fetches cross-origin files server-side so the browser
// can read them without being blocked by CORS (dev only).
function corsProxy() {
  return {
    name: 'cors-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/cors-proxy')) return next()

        const params = new URLSearchParams(req.url.split('?')[1])
        const targetUrl = params.get('url')

        if (!targetUrl) {
          res.statusCode = 400
          res.end('Missing url parameter')
          return
        }

        fetch(targetUrl)
          .then(async (response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const contentType = response.headers.get('content-type')
            if (contentType) res.setHeader('Content-Type', contentType)
            const buffer = Buffer.from(await response.arrayBuffer())
            res.end(buffer)
          })
          .catch((err) => {
            res.statusCode = 502
            res.end(err.message)
          })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), corsProxy()],
})
