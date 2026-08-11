/**
 * 深色模式（main.js 已引入 element-plus 暗色 CSS 变量，只需切换 html.dark 类）
 */
import { ref, watch } from 'vue'

const KEY = 'lite-tools:theme'
const isDark = ref(document.documentElement.classList.contains('dark'))

function apply(val) {
  document.documentElement.classList.toggle('dark', val)
  try {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', val ? '#1d1e1f' : '#ffffff')
  } catch {}
}

// 初始化：读取 localStorage
try {
  const saved = localStorage.getItem(KEY)
  if (saved) {
    isDark.value = saved === 'dark'
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    isDark.value = true
  }
  apply(isDark.value)
} catch {}

watch(isDark, (v) => {
  apply(v)
  try {
    localStorage.setItem(KEY, v ? 'dark' : 'light')
  } catch {}
})

export function useDark() {
  function toggle() {
    isDark.value = !isDark.value
  }
  return { isDark, toggle }
}
