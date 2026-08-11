<template>
  <div class="tool-page">
    <!-- 面包屑导航（SEO + 用户体验） -->
    <el-breadcrumb :separator-icon="ArrowRight" class="breadcrumb">
      <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
      <el-breadcrumb-item>{{ title }}</el-breadcrumb-item>
    </el-breadcrumb>

    <div class="tool-header">
      <h1 class="tool-title">{{ title }}</h1>
      <button
        v-if="favKey"
        class="fav-btn"
        :class="{ active: isFav(favKey) }"
        :title="isFav(favKey) ? '取消收藏' : '收藏到首页'"
        @click="toggleFav(favKey)"
      >
        <el-icon :size="16">
          <component :is="isFav(favKey) ? StarFilled : Star" />
        </el-icon>
        <span>{{ isFav(favKey) ? '已收藏' : '收藏' }}</span>
      </button>
    </div>
    <p class="tool-desc">{{ desc }}</p>

    <!-- 工具主体 -->
    <div class="tool-body">
      <slot />
    </div>

    <!-- 广告位预留：流量达标后接入广告联盟 -->
    <div class="ad-slot" aria-hidden="true">
      <!-- 广告位占位 -->
    </div>
  </div>
</template>

<script setup>
import { ArrowRight, Star, StarFilled } from '@element-plus/icons-vue'
import { useFavorites } from '@/composables/useRecentTools'

defineProps({
  title: { type: String, required: true },
  desc: { type: String, default: '' },
  favKey: { type: String, default: '' }
})

const { isFav, toggleFav } = useFavorites()
</script>

<style scoped>
.tool-page {
  width: 100%;
}

.breadcrumb {
  margin-bottom: 16px;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary, #303133);
  margin: 0;
}

.fav-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--color-border, #ebeef5);
  background: var(--color-surface, #fff);
  color: var(--color-text-secondary, #909399);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.fav-btn:hover {
  color: #e6a23c;
  border-color: #e6a23c;
}

.fav-btn.active {
  color: #e6a23c;
  border-color: #e6a23c;
  background: #fdf6ec;
}

.tool-desc {
  color: var(--color-text-secondary, #909399);
  font-size: 14px;
  margin: 8px 0 24px;
}

.tool-body {
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: var(--radius, 8px);
  padding: 24px;
}

.ad-slot {
  margin-top: 24px;
  min-height: 1px;
}

@media (max-width: 768px) {
  .tool-body {
    padding: 16px;
  }

  .tool-title {
    font-size: 20px;
  }
}
</style>
