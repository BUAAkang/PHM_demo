import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ }) => {
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      host: '0.0.0.0',
      cors: true,
      open: true,
      proxy: {
        '/api/v3': {
          target: 'https://ark.cn-beijing.volces.com',
          changeOrigin: true,
        }
      }
    },
  }
})
