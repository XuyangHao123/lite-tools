<template>
  <div class="home">
    <!-- 站点介绍 -->
    <section class="hero">
      <h1 class="hero-title">免费在线工具集合</h1>
      <p class="hero-subtitle">
        所有工具在浏览器本地运行，数据不上传，安全免费，无需登录。
      </p>
    </section>

    <!-- 按分类展示工具 -->
    <section v-for="cat in categories" :key="cat" class="tool-section">
      <h2 class="section-title">{{ cat }}</h2>
      <div class="tools-grid">
        <router-link
          v-for="tool in toolsByCategory(cat)"
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
  </div>
</template>

<script setup>
import { tools, getCategories } from '@/data/tools'

const categories = getCategories()

function toolsByCategory(cat) {
  return tools.filter((t) => t.category === cat)
}
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
  color: #303133;
  margin: 0 0 12px;
}

.hero-subtitle {
  color: #909399;
  font-size: 15px;
  margin: 0;
}

.tool-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 16px;
  padding-left: 12px;
  border-left: 4px solid #409eff;
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
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.tool-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.12);
  transform: translateY(-2px);
}

.tool-card-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ecf5ff;
  color: #409eff;
  border-radius: 8px;
}

.tool-card-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 6px;
}

.tool-card-desc {
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
