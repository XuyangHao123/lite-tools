import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import { tools } from '@/data/tools'

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: {
      title: 'Lite工具站 - 免费在线工具集合',
      description: '免费在线工具集合，提供二维码生成器、密码生成器等实用工具，全部免费、无需登录。'
    }
  },
  // 根据工具元数据自动生成路由
  ...tools.map((tool) => ({
    path: `/${tool.key}`,
    name: tool.key,
    component: tool.component,
    meta: {
      title: `${tool.name} - Lite工具站`,
      description: tool.desc,
      keywords: tool.keywords
    }
  })),
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

// 动态设置每个页面的 title / meta description / keywords
router.afterEach((to) => {
  const title = to.meta.title || 'Lite工具站'
  document.title = title

  const setMeta = (name, content) => {
    if (!content) return
    let el = document.querySelector(`meta[name="${name}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute('name', name)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }

  setMeta('description', to.meta.description)
  setMeta('keywords', to.meta.keywords)
})

export default router
