<template>
  <footer class="app-footer">
    <div class="footer-inner">
      <p>© {{ year }} Lite工具站 · 所有工具免费使用</p>
      <p class="footer-note">本站工具均在浏览器本地运行，数据不上传服务器，请放心使用。</p>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'
const year = computed(() => new Date().getFullYear())
</script>

<style scoped>
.app-footer {
  background: #f5f7fa;
  border-top: 1px solid #ebeef5;
  padding: 24px 16px;
  text-align: center;
  color: #909399;
  font-size: 13px;
  line-height: 1.8;
}

.footer-inner p {
  margin: 0;
}

.footer-note {
  font-size: 12px;
  color: #c0c4cc;
}
</style>
