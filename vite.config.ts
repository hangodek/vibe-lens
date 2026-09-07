import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { localAiPlugin } from './vite-plugin-local-ai.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), localAiPlugin()],
})
