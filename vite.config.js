import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// GitHub Pages 部署：仓库名为 lite-tools，base 需设为 /lite-tools/
// 若后续使用自定义域名，可将 base 改为 '/'
export default defineConfig({
  plugins: [
    vue(),
    // Element Plus 按需引入：自动导入 ElMessage、ElMessage 等API
    AutoImport({
      resolvers: [ElementPlusResolver()]
    }),
    // Element Plus 按需引入：自动注册组件
    Components({
      resolvers: [ElementPlusResolver()]
    })
  ],
  base: '/lite-tools/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    // 将第三方库拆分为独立 chunk，优化加载
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router'],
          'pdf-lib': ['pdf-lib'],
          'pdfjs': ['pdfjs-dist'],
          'pinyin': ['pinyin-pro'],
          'qrcode': ['qrcode'],
          'jsqr': ['jsqr'],
          'canvas2svg': ['canvas2svg']
          // element-plus 不在此列出，让按需引入自然拆分
        }
      }
    }
  }
})
