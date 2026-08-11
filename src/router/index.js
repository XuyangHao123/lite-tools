import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import NotFound from '@/views/NotFound.vue'
import { tools } from '@/data/tools'
import { pushRecent } from '@/composables/useRecentTools'

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
    component: NotFound,
    meta: {
      title: '页面未找到 - Lite工具站',
      description: '你访问的页面不存在。'
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

// 动态设置每个页面的 title / meta description / keywords / OG / canonical
router.afterEach((to) => {
  const title = to.meta.title || 'Lite工具站'
  const description = to.meta.description || ''
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

  const setOg = (property, content) => {
    if (!content) return
    let el = document.querySelector(`meta[property="${property}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute('property', property)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }

  // 注入/更新 JSON-LD 结构化数据
  let jsonLdEl = document.getElementById('ld-json-page')
  if (!jsonLdEl) {
    jsonLdEl = document.createElement('script')
    jsonLdEl.id = 'ld-json-page'
    jsonLdEl.setAttribute('type', 'application/ld+json')
    document.head.appendChild(jsonLdEl)
  }
  function setJsonLd(builder) {
    let data = null
    try {
      data = builder()
    } catch {}
    jsonLdEl.textContent = data ? JSON.stringify(data) : ''
  }

  setMeta('description', description)
  setMeta('keywords', to.meta.keywords)
  setOg('og:title', title)
  setOg('og:description', description)
  setOg('og:type', 'website')
  setOg('og:url', window.location.href)

  // canonical link（集中 SEO 权重）
  let canonical = document.querySelector('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.setAttribute('rel', 'canonical')
    document.head.appendChild(canonical)
  }
  canonical.setAttribute('href', window.location.href)

  // JSON-LD 结构化数据：首页 ItemList 列出全部工具，工具页 WebApplication
  setJsonLd(() => {
    const base = window.location.origin + import.meta.env.BASE_URL
    if (to.name === 'home') {
      return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Lite工具站 - 免费在线工具集合',
        itemListElement: tools.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: t.name,
          url: base + t.key
        }))
      }
    } else if (to.name && to.name !== 'not-found') {
      const t = tools.find((x) => x.key === to.name)
      if (!t) return null
      return {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: t.name,
        description: t.desc,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
        url: base + t.key
      }
    }
    return null
  })

  // 记录最近访问的工具
  if (to.name && to.name !== 'home' && to.name !== 'not-found') {
    pushRecent(to.name)
  }
})

export default router
