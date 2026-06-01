import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const commitDate = execSync('git log -1 --format=%cI', {
  encoding: 'utf8',
}).trim()

export default defineConfig({
  base: '/Bruscles/',
  define: {
    'import.meta.env.VITE_COMMIT_DATE': JSON.stringify(commitDate),
  },
  plugins: [react()],
})
