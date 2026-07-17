<template>
  <ToolLayout title="CSS 渐变生成器" desc="免费在线CSS渐变生成器，支持线性/径向渐变，可视化调色，一键复制代码，本地处理。">
    <div class="gradient-tool">
      <!-- 预览 -->
      <div class="gradient-preview" :style="{ background: cssCode }"></div>

      <!-- 类型 -->
      <div class="config-section">
        <label class="config-title">渐变类型</label>
        <el-radio-group v-model="type">
          <el-radio-button value="linear">线性渐变</el-radio-button>
          <el-radio-button value="radial">径向渐变</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 角度（线性） -->
      <div v-if="type === 'linear'" class="config-section">
        <label class="config-title">角度</label>
        <el-slider v-model="angle" :min="0" :max="360" :step="5" show-input :show-input-controls="false" />
      </div>

      <!-- 颜色节点 -->
      <div class="config-section">
        <label class="config-title">颜色节点</label>
        <div class="stops-list">
          <div v-for="(stop, i) in stops" :key="i" class="stop-item">
            <el-color-picker v-model="stop.color" />
            <el-slider v-model="stop.pos" :min="0" :max="100" :step="1" style="width:120px" />
            <span class="stop-pos">{{ stop.pos }}%</span>
            <el-button :icon="Delete" circle size="small" @click="removeStop(i)" v-if="stops.length > 2" />
          </div>
        </div>
        <el-button size="small" :icon="Plus" @click="addStop">添加颜色</el-button>
      </div>

      <!-- 代码输出 -->
      <div class="code-section">
        <label class="config-title">CSS 代码</label>
        <el-input :model-value="cssCode" readonly type="textarea" :rows="3" />
        <el-button type="primary" :icon="CopyDocument" @click="copyCode" style="margin-top:8px">复制代码</el-button>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, Delete, Plus } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'

const type = ref('linear')
const angle = ref(90)
const stops = ref([
  { color: '#409eff', pos: 0 },
  { color: '#67c23a', pos: 50 },
  { color: '#f56c6c', pos: 100 }
])

const cssCode = computed(() => {
  const stopsStr = stops.value
    .sort((a, b) => a.pos - b.pos)
    .map((s) => `${s.color} ${s.pos}%`)
    .join(', ')
  if (type.value === 'linear') {
    return `background: linear-gradient(${angle.value}deg, ${stopsStr});`
  }
  return `background: radial-gradient(circle, ${stopsStr});`
})

function addStop() {
  stops.value.push({ color: '#909399', pos: 50 })
}

function removeStop(i) {
  stops.value.splice(i, 1)
}

async function copyCode() {
  try { await navigator.clipboard.writeText(cssCode.value); ElMessage.success('代码已复制') }
  catch { ElMessage.error('复制失败') }
}
</script>

<style scoped>
.gradient-tool { display: flex; flex-direction: column; gap: 20px; }
.gradient-preview { width: 100%; height: 200px; border-radius: 8px; border: 1px solid #ebeef5; }
.config-section { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: #303133; }
.stops-list { display: flex; flex-direction: column; gap: 8px; }
.stop-item { display: flex; align-items: center; gap: 12px; }
.stop-pos { font-size: 12px; color: #909399; width: 40px; }
.code-section { display: flex; flex-direction: column; gap: 8px; }
</style>
