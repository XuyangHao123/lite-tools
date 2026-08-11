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
    // chunk 拆分：仅手动固定 vue 核心到 vue-vendor，
    // 其余第三方库交给 Rollup 按 import 图自动分片。
    // 之前用对象式/函数式 manualChunks 强制把 pdf-lib 等单独成 chunk，
    // 会导致 Rollup 把被多 chunk 共享的瞬时依赖并进该 chunk，
    // 进而让入口 chunk 静态 import 它 → 首页被预加载 429KB pdf-lib。
    // 自动分片配合路由懒加载，能让重库只在访问对应工具时才加载。
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/vue/') || id.includes('/vue-router/') || id.includes('/@vue/')) {
              return 'vue-vendor'
            }
          }
          // 其余交给 Rollup 自动分片（按动态 import 边界）
        }
      }
    }
  }
})
