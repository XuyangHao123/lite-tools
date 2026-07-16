<template>
  <div class="tool-page">
    <!-- 面包屑导航（SEO + 用户体验） -->
    <el-breadcrumb :separator-icon="ArrowRight" class="breadcrumb">
      <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
      <el-breadcrumb-item>{{ title }}</el-breadcrumb-item>
    </el-breadcrumb>

    <h1 class="tool-title">{{ title }}</h1>
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
import { ArrowRight } from '@element-plus/icons-vue'

defineProps({
  title: { type: String, required: true },
  desc: { type: String, default: '' }
})
</script>

<style scoped>
.tool-page {
  width: 100%;
}

.breadcrumb {
  margin-bottom: 16px;
}

.tool-title {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 8px;
}

.tool-desc {
  color: #909399;
  font-size: 14px;
  margin: 0 0 24px;
}

.tool-body {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
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
