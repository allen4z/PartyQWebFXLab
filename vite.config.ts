import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Capacitor's iOS WKWebView serves assets from a custom URL scheme without CORS
// headers, so Vite's default `crossorigin` attribute makes WKWebView refuse to
// execute the module script (blank screen). Strip it from the built index.html.
function stripCrossorigin(): Plugin {
  return {
    name: 'strip-crossorigin',
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin/g, '')
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), stripCrossorigin()],
  server: {
    host: true,
  },
})
