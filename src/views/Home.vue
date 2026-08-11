<template>
  <div class="home">
    <!-- 站点介绍 -->
    <section class="hero">
      <h1 class="hero-title">免费在线工具集合</h1>
      <p class="hero-subtitle">
        所有工具在浏览器本地运行，数据不上传，安全免费，无需登录。
      </p>
      <div class="hero-search">
        <el-input
          v-model="search"
          size="large"
          placeholder="搜索工具，如「PDF 合并」「JSON」「二维码」…"
          :prefix-icon="Search"
          clearable
        />
      </div>
    </section>

    <!-- 最近使用 -->
    <section v-if="recentList.length && !search" class="tool-section recent-section">
      <h2 class="section-title">
        <el-icon><Clock /></el-icon> 最近使用
      </h2>
      <div class="tools-grid">
        <router-link
          v-for="t in recentList"
          :key="t.key"
          :to="`/${t.key}`"
          class="tool-card"
        >
          <div class="tool-card-icon">
            <el-icon :size="28"><component :is="t.icon" /></el-icon>
          </div>
          <div class="tool-card-info">
            <h3 class="tool-card-name">{{ t.name }}</h3>
            <p class="tool-card-desc">{{ t.desc }}</p>
          </div>
        </router-link>
      </div>
    </section>

    <!-- 收藏夹 -->
    <section v-if="favoriteList.length && !search" class="tool-section recent-section">
      <h2 class="section-title">
        <el-icon><Star /></el-icon> 我的收藏
      </h2>
      <div class="tools-grid">
        <router-link
          v-for="t in favoriteList"
          :key="t.key"
          :to="`/${t.key}`"
          class="tool-card"
        >
          <div class="tool-card-icon">
            <el-icon :size="28"><component :is="t.icon" /></el-icon>
          </div>
          <div class="tool-card-info">
            <h3 class="tool-card-name">{{ t.name }}</h3>
            <p class="tool-card-desc">{{ t.desc }}</p>
          </div>
        </router-link>
      </div>
    </section>

    <!-- 按分类展示工具 -->
    <section
      v-for="cat in categories"
      :key="cat"
      v-show="!search || categoryFiltered(cat).length"
      class="tool-section"
    >
      <h2 class="section-title">{{ cat }}</h2>
      <div class="tools-grid">
        <router-link
          v-for="tool in categoryFiltered(cat)"
          :key="tool.key"
          :to="`/${tool.key}`"
          class="tool-card"
        >
          <div class="tool-card-icon">
            <el-icon :size="28"><component :is="tool.icon" /></el-icon>
          </div>
          <div class="tool-card-info">
            <h3 class="tool-card-name">{{ tool.name }}</h3>
            <p class="tool-card-desc">{{ tool.desc }}</p>
          </div>
        </router-link>
      </div>
    </section>

    <!-- 搜索无结果 -->
    <section v-if="search && !searchResults.length" class="empty-search">
      <el-empty description="未找到相关工具" />
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search, Clock, Star } from '@element-plus/icons-vue'
import { tools, getCategories } from '@/data/tools'
import { useRecent, useFavorites } from '@/composables/useRecentTools'

const categories = getCategories()
const { recent } = useRecent()
const { favorites } = useFavorites()
const search = ref('')

const recentList = computed(() =>
  recent.value.map((k) => tools.find((t) => t.key === k)).filter(Boolean)
)

const favoriteList = computed(() =>
  favorites.value.map((k) => tools.find((t) => t.key === k)).filter(Boolean)
)

function toolsByCategory(cat) {
  return tools.filter((t) => t.category === cat)
}

function categoryFiltered(cat) {
  const q = search.value.trim().toLowerCase()
  if (!q) return toolsByCategory(cat)
  return toolsByCategory(cat).filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.desc.toLowerCase().includes(q) ||
      t.keywords.toLowerCase().includes(q) ||
      t.key.toLowerCase().includes(q)
  )
}

const searchResults = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return []
  return tools.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.desc.toLowerCase().includes(q) ||
      t.keywords.toLowerCase().includes(q)
  )
})
</script>

<style scoped>
.home {
  width: 100%;
}

.hero {
  text-align: center;
  padding: 40px 16px 32px;
}

.hero-title {
  font-size: 30px;
  font-weight: 800;
  color: var(--color-text-primary, #303133);
  margin: 0 0 12px;
}

.hero-subtitle {
  color: var(--color-text-secondary, #909399);
  font-size: 15px;
  margin: 0 0 24px;
}

.hero-search {
  max-width: 560px;
  margin: 0 auto;
}

.tool-section {
  margin-bottom: 32px;
}

.recent-section .section-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary, #303133);
  margin: 0 0 16px;
  padding-left: 12px;
  border-left: 4px solid var(--color-primary, #409eff);
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.tool-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: var(--radius, 8px);
  text-decoration: none;
  transition: all 0.2s ease;
}

.tool-card:hover {
  border-color: var(--color-primary, #409eff);
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}

.tool-card-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-light, #ecf5ff);
  color: var(--color-primary, #409eff);
  border-radius: 8px;
}

.tool-card-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary, #303133);
  margin: 0 0 6px;
}

.tool-card-desc {
  font-size: 13px;
  color: var(--color-text-secondary, #909399);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty-search {
  padding: 40px 16px;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 22px;
  }

  .tools-grid {
    grid-template-columns: 1fr;
  }
}
</style>
