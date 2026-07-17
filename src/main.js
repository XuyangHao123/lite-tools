import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/main.css'

// Element Plus 按需引入：组件和 API 由 unplugin-auto-import / unplugin-vue-components 自动导入
// 仅需手动引入暗色模式所需的 CSS 变量基础样式
import 'element-plus/theme-chalk/dark/css-vars.css'

const app = createApp(App)
app.use(router)
app.mount('#app')
