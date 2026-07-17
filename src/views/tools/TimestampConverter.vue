<template>
  <ToolLayout title="时间戳转换" desc="免费在线Unix时间戳转换工具，支持时间戳与日期互转，本地处理。">
    <div class="timestamp-tool">
      <!-- 时间戳 → 日期 -->
      <div class="convert-section">
        <h3 class="section-title">时间戳 → 日期</h3>
        <div class="convert-row">
          <el-input v-model="timestampInput" placeholder="输入时间戳，如 1697040000" size="large" class="flex-1" />
          <el-radio-group v-model="tsUnit" size="default">
            <el-radio-button value="s">秒</el-radio-button>
            <el-radio-button value="ms">毫秒</el-radio-button>
          </el-radio-group>
        </div>
        <div v-if="dateResult" class="result-display">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="本地时间">{{ dateResult.local }}</el-descriptions-item>
            <el-descriptions-item label="UTC时间">{{ dateResult.utc }}</el-descriptions-item>
            <el-descriptions-item label="ISO 8601">{{ dateResult.iso }}</el-descriptions-item>
            <el-descriptions-item label="相对时间">{{ dateResult.relative }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <el-divider />

      <!-- 日期 → 时间戳 -->
      <div class="convert-section">
        <h3 class="section-title">日期 → 时间戳</h3>
        <div class="convert-row">
          <el-date-picker v-model="dateInput" type="datetime" placeholder="选择日期时间" size="large" class="flex-1" />
          <el-button type="primary" size="large" @click="convertToDate">转换</el-button>
        </div>
        <div v-if="tsResult" class="result-display">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="秒级时间戳">{{ tsResult.seconds }}</el-descriptions-item>
            <el-descriptions-item label="毫秒级时间戳">{{ tsResult.millis }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <el-divider />

      <!-- 当前时间 -->
      <div class="now-section">
        <h3 class="section-title">当前时间</h3>
        <div class="now-display">
          <div class="now-item"><span class="now-label">时间戳(秒)</span><code>{{ now.seconds }}</code></div>
          <div class="now-item"><span class="now-label">时间戳(毫秒)</span><code>{{ now.millis }}</code></div>
          <div class="now-item"><span class="now-label">当前时间</span><code>{{ now.local }}</code></div>
        </div>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import ToolLayout from '@/components/ToolLayout.vue'

const timestampInput = ref('')
const tsUnit = ref('s')
const dateInput = ref(new Date())

const now = ref({ seconds: 0, millis: 0, local: '' })
let timer = null

onMounted(() => {
  const update = () => {
    const d = new Date()
    now.value = {
      seconds: Math.floor(d.getTime() / 1000),
      millis: d.getTime(),
      local: d.toLocaleString('zh-CN')
    }
  }
  update()
  timer = setInterval(update, 1000)
})
onUnmounted(() => clearInterval(timer))

const dateResult = computed(() => {
  const ts = parseInt(timestampInput.value)
  if (isNaN(ts)) return null
  const ms = tsUnit.value === 's' ? ts * 1000 : ts
  const d = new Date(ms)
  if (isNaN(d.getTime())) return null

  const diff = Date.now() - ms
  let relative = ''
  const absDiff = Math.abs(diff)
  if (absDiff < 60000) relative = diff > 0 ? `${Math.round(absDiff / 1000)}秒前` : `${Math.round(absDiff / 1000)}秒后`
  else if (absDiff < 3600000) relative = diff > 0 ? `${Math.round(absDiff / 60000)}分钟前` : `${Math.round(absDiff / 60000)}分钟后`
  else if (absDiff < 86400000) relative = diff > 0 ? `${Math.round(absDiff / 3600000)}小时前` : `${Math.round(absDiff / 3600000)}小时后`
  else relative = diff > 0 ? `${Math.round(absDiff / 86400000)}天前` : `${Math.round(absDiff / 86400000)}天后`

  return {
    local: d.toLocaleString('zh-CN'),
    utc: d.toUTCString(),
    iso: d.toISOString(),
    relative
  }
})

const tsResult = computed(() => {
  if (!dateInput.value) return null
  const ms = new Date(dateInput.value).getTime()
  if (isNaN(ms)) return null
  return { seconds: Math.floor(ms / 1000), millis: ms }
})

function convertToDate() {
  if (!tsResult.value) ElMessage.warning('请选择有效的日期时间')
}
</script>

<style scoped>
.timestamp-tool { display: flex; flex-direction: column; gap: 8px; }
.convert-section { display: flex; flex-direction: column; gap: 12px; }
.section-title { font-size: 16px; font-weight: 700; color: #303133; margin: 0; }
.convert-row { display: flex; gap: 12px; align-items: center; }
.flex-1 { flex: 1; }
.result-display { margin-top: 4px; }
.now-section { display: flex; flex-direction: column; gap: 12px; }
.now-display { display: flex; flex-direction: column; gap: 8px; }
.now-item { display: flex; align-items: center; gap: 12px; }
.now-label { width: 120px; font-size: 13px; color: #909399; }
.now-item code { font-size: 14px; color: #303133; font-family: monospace; }
@media (max-width: 768px) { .convert-row { flex-direction: column; } }
</style>
