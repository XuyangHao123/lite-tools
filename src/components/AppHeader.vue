<template>
  <header class="app-header">
    <div class="header-inner">
      <div class="header-left">
        <router-link to="/" class="logo">
          <span class="logo-text">Lite<span class="logo-accent">工具站</span></span>
        </router-link>
      </div>

      <nav class="header-nav" :class="{ open: menuOpen }" aria-label="主导航">
        <router-link to="/" class="nav-link" @click="menuOpen = false">首页</router-link>
        <el-dropdown
          v-for="cat in categories"
          :key="cat"
          trigger="hover"
          :hide-on-click="true"
          @visible-change="onDropdown"
        >
          <span class="nav-link cat-link">
            {{ cat }}
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="t in toolsByCategory(cat)"
                :key="t.key"
                @click="goTool(t.key)"
              >
                {{ t.name }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </nav>

      <div class="header-right">
        <el-input
          v-model="search"
          class="search-box"
          placeholder="搜索工具…"
          :prefix-icon="Search"
          clearable
          @focus="showResults = true"
          @blur="onSearchBlur"
        />
        <div v-if="showResults && search" class="search-results">
          <router-link
            v-for="t in searchResults"
            :key="t.key"
            :to="`/${t.key}`"
            class="result-item"
            @click="clearSearch"
          >
            <span class="result-name">{{ t.name }}</span>
            <span class="result-cat">{{ t.category }}</span>
          </router-link>
          <div v-if="!searchResults.length" class="result-empty">未找到相关工具</div>
        </div>

        <button class="theme-toggle" :title="isDark ? '切换到浅色' : '切换到深色'" @click="toggle">
          <el-icon :size="18">
            <component :is="isDark ? Sunny : Moon" />
          </el-icon>
        </button>

        <button class="menu-btn" :title="menuOpen ? '关闭菜单' : '打开菜单'" @click="menuOpen = !menuOpen">
          <el-icon :size="22"><component :is="menuOpen ? Close : Menu" /></el-icon>
        </button>
      </div>
    </div>

    <!-- 移动端展开的分类导航 -->
    <nav v-if="menuOpen" class="mobile-nav" aria-label="移动端导航">
      <div v-for="cat in categories" :key="cat" class="mobile-cat">
        <div class="mobile-cat-title">{{ cat }}</div>
        <div class="mobile-cat-items">
          <router-link
            v-for="t in toolsByCategory(cat)"
            :key="t.key"
            :to="`/${t.key}`"
            class="mobile-link"
            @click="menuOpen = false"
          >
            {{ t.name }}
          </router-link>
        </div>
      </div>
    </nav>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowDown,
  Search,
  Sunny,
  Moon,
  Menu,
  Close
} from '@element-plus/icons-vue'
import { tools, getCategories } from '@/data/tools'
import { useDark } from '@/composables/useDark'

const router = useRouter()
const { isDark, toggle } = useDark()
const categories = getCategories()
const search = ref('')
const showResults = ref(false)
const menuOpen = ref(false)

function toolsByCategory(cat) {
  return tools.filter((t) => t.category === cat)
}

const searchResults = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return []
  return tools
    .filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.desc.toLowerCase().includes(q) ||
        t.keywords.toLowerCase().includes(q) ||
        t.key.toLowerCase().includes(q)
    )
    .slice(0, 8)
})

function goTool(key) {
  router.push(`/${key}`)
}

function clearSearch() {
  search.value = ''
  showResults.value = false
}

function onSearchBlur() {
  // 延迟以便点击结果时先跳转
  setTimeout(() => (showResults.value = false), 200)
}

function onDropdown() {}
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-surface, #fff);
  border-bottom: 1px solid var(--color-border, #ebeef5);
  box-shadow: var(--shadow-sm);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left {
  flex-shrink: 0;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  color: var(--color-text-regular, #606266);
  text-decoration: none;
  font-size: 14px;
  border-radius: 4px;
  cursor: pointer;
  outline: none;
}

.nav-link:hover,
.nav-link:focus {
  color: var(--color-primary, #409eff);
  background: var(--color-primary-light, #ecf5ff);
}

.logo {
  text-decoration: none;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary, #303133);
  white-space: nowrap;
}

.logo-accent {
  color: var(--color-primary, #409eff);
}

.header-right {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.search-box {
  width: 200px;
}

.search-results {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  left: auto;
  width: 320px;
  max-height: 400px;
  overflow-y: auto;
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
  z-index: 200;
  padding: 6px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  text-decoration: none;
  color: var(--color-text-regular, #606266);
  font-size: 13px;
}

.result-item:hover {
  background: var(--color-primary-light, #ecf5ff);
  color: var(--color-primary, #409eff);
}

.result-name {
  font-weight: 500;
}

.result-cat {
  font-size: 11px;
  color: var(--color-text-secondary, #909399);
}

.result-empty {
  padding: 16px;
  text-align: center;
  color: var(--color-text-secondary, #909399);
  font-size: 13px;
}

.theme-toggle,
.menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border, #ebeef5);
  background: var(--color-surface, #fff);
  color: var(--color-text-regular, #606266);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-toggle:hover,
.menu-btn:hover {
  color: var(--color-primary, #409eff);
  border-color: var(--color-primary, #409eff);
}

.menu-btn {
  display: none;
}

.mobile-nav {
  display: none;
  padding: 12px 16px 16px;
  border-top: 1px solid var(--color-border, #ebeef5);
  background: var(--color-surface, #fff);
  max-height: 70vh;
  overflow-y: auto;
}

.mobile-cat {
  margin-bottom: 12px;
}

.mobile-cat-title {
  font-size: 12px;
  color: var(--color-text-secondary, #909399);
  margin-bottom: 6px;
}

.mobile-cat-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mobile-link {
  display: inline-block;
  padding: 4px 10px;
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: 14px;
  text-decoration: none;
  color: var(--color-text-regular, #606266);
  font-size: 13px;
}

.mobile-link:hover {
  border-color: var(--color-primary, #409eff);
  color: var(--color-primary, #409eff);
}

@media (max-width: 768px) {
  .header-nav,
  .search-box {
    display: none;
  }

  .menu-btn {
    display: flex;
  }

  .mobile-nav {
    display: block;
  }

  .header-inner {
    height: 52px;
  }
}
</style>
