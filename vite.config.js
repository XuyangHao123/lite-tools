import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// GitHub Pages 部署：仓库名为 lite-tools，base 需设为 /lite-tools/
// 若后续使用自定义域名，可将 base 改为 '/'
export default defineConfig({
  plugins: [vue()],
  base: '/lite-tools/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000
  }
})
