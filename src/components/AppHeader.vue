<template>
  <header class="app-header">
    <div class="header-inner">
      <router-link to="/" class="logo">
        <span class="logo-text">Lite<span class="logo-accent">工具站</span></span>
      </router-link>
      <nav class="header-nav">
        <router-link to="/">首页</router-link>
      </nav>
    </div>
  </header>
</template>

<script setup>
// 顶部导航，后续工具多了可在此加分类下拉
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  text-decoration: none;
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}

.logo-accent {
  color: #409eff;
}

.header-nav a {
  color: #606266;
  text-decoration: none;
  font-size: 14px;
}

.header-nav a:hover {
  color: #409eff;
}
</style>
