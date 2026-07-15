/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        despliegue: 'despliegue.html',
      },
    },
  },
  // Tests unitarios y de componentes (Vitest + Testing Library + jsdom).
  // Sin `globals`: cada test importa describe/it/expect de "vitest" explícito,
  // así ni eslint ni tsconfig necesitan tipos globales inyectados.
  test: {
    environment: 'jsdom',
    setupFiles: ['src/setupTests.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
