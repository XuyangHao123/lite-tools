<template>
  <div class="not-found">
    <div class="nf-code">404</div>
    <h1 class="nf-title">页面未找到</h1>
    <p class="nf-desc">你访问的工具不存在或已下线。也许你想找的是：</p>
    <div class="nf-suggest">
      <router-link
        v-for="t in suggestions"
        :key="t.key"
        :to="`/${t.key}`"
        class="nf-chip"
      >
        {{ t.name }}
      </router-link>
    </div>
    <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
  </div>
</template>

<script setup>
import { tools } from '@/data/tools'
// 随机推荐 6 个工具
const shuffled = [...tools].sort(() => Math.random() - 0.5)
const suggestions = shuffled.slice(0, 6)
</script>

<style scoped>
.not-found {
  text-align: center;
  padding: 60px 16px 40px;
}

.nf-code {
  font-size: 96px;
  font-weight: 800;
  color: var(--color-primary, #409eff);
  line-height: 1;
  margin-bottom: 16px;
}

.nf-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary, #303133);
  margin: 0 0 8px;
}

.nf-desc {
  color: var(--color-text-secondary, #909399);
  margin: 0 0 24px;
}

.nf-suggest {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 28px;
}

.nf-chip {
  display: inline-block;
  padding: 6px 14px;
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: 20px;
  color: var(--color-text-regular, #606266);
  text-decoration: none;
  font-size: 13px;
  transition: all 0.2s;
}

.nf-chip:hover {
  border-color: var(--color-primary, #409eff);
  color: var(--color-primary, #409eff);
}
</style>
