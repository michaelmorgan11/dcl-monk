import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'

// app.js stays a classic script so the page still works when index.html is opened
// straight off disk - a type="module" script is blocked over file:// and takes the
// calculator, the scenario buttons and the chart down with it silently.
//
// The trade-off is that vite refuses to bundle a non-module script and drops it from
// the build, so copy it through to dist verbatim instead.
export default defineConfig({
  // relative asset URLs, so dist/ works under a subpath (GitHub Pages serves the
  // repo at /<repo>/) as well as at a domain root (Vercel)
  base: './',

  // v0 and other cloud sandboxes serve the dev server on a generated hostname.
  // Vite blocks unknown Host headers by default (DNS-rebinding protection), so
  // allow the sandbox domains rather than one host that changes per session.
  server: {
    host: true,
    allowedHosts: ['.vercel.run', '.vercel.app', 'localhost']
  },
  preview: {
    host: true,
    allowedHosts: ['.vercel.run', '.vercel.app', 'localhost']
  },
  plugins: [
    {
      name: 'copy-classic-script',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'app.js',
          source: readFileSync('app.js', 'utf8')
        })
      }
    }
  ]
})
