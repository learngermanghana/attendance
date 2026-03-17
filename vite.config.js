import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Work around a Firefox runtime error in the minified bundle:
    // "can't access lexical declaration before initialization".
    minify: false,
  },
})
