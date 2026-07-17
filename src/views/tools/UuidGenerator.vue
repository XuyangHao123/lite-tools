<template>
  <ToolLayout title="UUID 生成器" desc="免费在线生成UUID/GUID，支持批量生成、多种格式，使用加密安全随机数，本地生成。">
    <div class="uuid-tool">
      <div class="config-section">
        <label class="config-title">生成数量</label>
        <el-input-number v-model="count" :min="1" :max="100" size="large" />
      </div>

      <div class="config-section">
        <label class="config-title">格式</label>
        <el-radio-group v-model="format">
          <el-radio-button value="standard">标准 (带连字符)</el-radio-button>
          <el-radio-button value="nodash">无连字符</el-radio-button>
          <el-radio-button value="uppercase">大写</el-radio-button>
          <el-radio-button value="braces">带花括号</el-radio-button>
        </el-radio-group>
      </div>

      <div class="config-section">
        <label class="config-title">版本</label>
        <el-radio-group v-model="version">
          <el-radio-button value="4">UUID v4（随机）</el-radio-button>
          <el-radio-button value="nil">Nil UUID（全零）</el-radio-button>
        </el-radio-group>
      </div>

      <div class="action-bar">
        <el-button type="primary" size="large" @click="generate">生成</el-button>
        <el-button size="large" @click="copyAll" :disabled="!results.length">全部复制</el-button>
        <el-button size="large" @click="results = []" :disabled="!results.length">清空</el-button>
      </div>

      <div v-if="results.length" class="result-list">
        <div v-for="(id, i) in results" :key="i" class="result-item">
          <code class="uuid-code">{{ id }}</code>
          <el-button size="small" :icon="CopyDocument" @click="copyOne(id)">复制</el-button>
        </div>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'

const count = ref(1)
const format = ref('standard')
const version = ref('4')
const results = ref([])

/** 生成 UUID v4（加密安全） */
function uuidv4() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  // 设置版本号(4)和变体号
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
}

function generate() {
  results.value = []
  for (let i = 0; i < count.value; i++) {
    let id = version.value === 'nil' ? '00000000-0000-0000-0000-000000000000' : uuidv4()
    if (format.value === 'nodash') id = id.replace(/-/g, '')
    else if (format.value === 'uppercase') id = id.toUpperCase()
    else if (format.value === 'braces') id = `{${id}}`
    results.value.push(id)
  }
}

async function copyOne(id) {
  try { await navigator.clipboard.writeText(id); ElMessage.success('已复制') }
  catch { ElMessage.error('复制失败') }
}

async function copyAll() {
  try { await navigator.clipboard.writeText(results.value.join('\n')); ElMessage.success('已复制全部') }
  catch { ElMessage.error('复制失败') }
}

generate()
</script>

<style scoped>
.uuid-tool { display: flex; flex-direction: column; gap: 20px; }
.config-section { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: #303133; }
.action-bar { display: flex; gap: 12px; }
.result-list { display: flex; flex-direction: column; gap: 8px; }
.result-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #f5f7fa; border-radius: 6px; }
.uuid-code { font-size: 14px; color: #303133; word-break: break-all; }
</style>
