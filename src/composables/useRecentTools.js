/**
 * 最近使用 / 收藏工具（localStorage 持久化）
 */
import { ref, watch } from 'vue'

const RECENT_KEY = 'lite-tools:recent'
const FAV_KEY = 'lite-tools:favorites'
const MAX_RECENT = 12

function readArr(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

const recent = ref(readArr(RECENT_KEY))
const favorites = ref(readArr(FAV_KEY))

watch(recent, (v) => localStorage.setItem(RECENT_KEY, JSON.stringify(v)), { deep: true })
watch(favorites, (v) => localStorage.setItem(FAV_KEY, JSON.stringify(v)), { deep: true })

/** 记录访问某个工具 key */
export function pushRecent(key) {
  if (!key) return
  const idx = recent.value.indexOf(key)
  if (idx >= 0) recent.value.splice(idx, 1)
  recent.value.unshift(key)
  if (recent.value.length > MAX_RECENT) recent.value.length = MAX_RECENT
}

export function useRecent() {
  return { recent, pushRecent }
}

export function useFavorites() {
  const isFav = (key) => favorites.value.includes(key)
  function toggleFav(key) {
    if (!key) return
    const idx = favorites.value.indexOf(key)
    if (idx >= 0) favorites.value.splice(idx, 1)
    else favorites.value.push(key)
  }
  return { favorites, isFav, toggleFav }
}
