<template>
  <ToolLayout
    title="URL 编解码"
    desc="免费在线 URL 编码与解码工具，支持 encodeURI/encodeURIComponent/decodeURI/decodeURIComponent，附 URL 解析与参数构建器。"
    fav-key="url-encoder"
  >
    <div class="url-tool">
      <div class="action-bar">
        <el-radio-group v-model="mode" size="small">
          <el-radio-button value="encode">编码</el-radio-button>
          <el-radio-button value="decode">解码</el-radio-button>
          <el-radio-button value="parse">解析</el-radio-button>
          <el-radio-button value="build">参数构建</el-radio-button>
        </el-radio-group>
        <el-button :icon="Sort" size="small" @click="swap" :disabled="!output">互换</el-button>
        <div class="spacer"></div>
        <el-button @click="clear" :disabled="!input" size="small">清空</el-button>
      </div>

      <!-- 编码/解码模式选择函数 -->
      <div class="func-select" v-if="mode === 'encode' || mode === 'decode'">
        <el-radio-group v-model="func" size="small">
          <el-radio-button v-if="mode === 'encode'" value="encodeURIComponent">encodeURIComponent（推荐）</el-radio-button>
          <el-radio-button v-if="mode === 'encode'" value="encodeURI">encodeURI（保留特殊字符）</el-radio-button>
          <el-radio-button v-if="mode === 'decode'" value="decodeURIComponent">decodeURIComponent</el-radio-button>
          <el-radio-button v-if="mode === 'decode'" value="decodeURI">decodeURI</el-radio-button>
        </el-radio-group>
      </div>

      <div class="tool-row" v-if="mode === 'encode' || mode === 'decode'">
        <div class="io-panel">
          <div class="panel-header"><span class="panel-title">输入</span></div>
          <el-input v-model="input" type="textarea" :rows="6" :placeholder="mode === 'encode' ? '输入要编码的 URL 或文本' : '输入要解码的 URL 编码字符串'" />
        </div>
        <div class="io-panel">
          <div class="panel-header">
            <span class="panel-title">输出</span>
            <el-button :icon="CopyDocument" size="small" @click="copy(output)" :disabled="!output">复制</el-button>
          </div>
          <el-input v-model="output" type="textarea" :rows="6" readonly placeholder="结果将自动显示" />
        </div>
      </div>

      <div v-if="error" class="error-msg"><el-alert :title="error" type="error" show-icon :closable="false" /></div>

      <!-- URL 解析视图 -->
      <div v-if="mode === 'parse'">
        <div class="io-panel">
          <div class="panel-header"><span class="panel-title">输入 URL</span></div>
          <el-input v-model="input" type="textarea" :rows="3" placeholder="输入完整 URL，如 https://user:pass@example.com:8080/path/to?q=1#hash" />
        </div>
        <div v-if="parsedUrl" class="parsed-view">
          <div v-for="f in parsedFields" :key="f.label" class="parsed-row">
            <span class="parsed-label">{{ f.label }}</span>
            <span class="parsed-value" :class="{ empty: !f.value }">{{ f.value || '—' }}</span>
            <el-button v-if="f.value" text size="small" :icon="CopyDocument" @click="copy(f.value)" />
          </div>
          <div v-if="queryPairs.length" class="query-list">
            <div class="parsed-label" style="margin-bottom:8px">查询参数（query）</div>
            <div v-for="p in queryPairs" :key="p.name" class="parsed-row">
              <span class="parsed-value mono">{{ p.name }}</span>
              <span class="parsed-eq">=</span>
              <span class="parsed-value mono">{{ p.value }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 查询参数构建器 -->
      <div v-if="mode === 'build'" class="builder">
        <div class="builder-url">
          <el-input v-model="baseUrl" placeholder="基础 URL（可选，如 https://example.com/api）" />
        </div>
        <div class="builder-params">
          <div v-for="(p, i) in params" :key="i" class="param-row">
            <el-input v-model="p.name" placeholder="参数名" class="param-name" />
            <span class="param-eq">=</span>
            <el-input v-model="p.value" placeholder="参数值" class="param-value" />
            <el-button text :icon="Delete" @click="params.splice(i, 1)" :disabled="params.length <= 1" />
          </div>
        </div>
        <el-button :icon="Plus" @click="params.push({ name: '', value: '' })">添加参数</el-button>
        <div class="builder-output">
          <div class="panel-header">
            <span class="panel-title">生成的 URL</span>
            <el-button :icon="CopyDocument" size="small" @click="copy(builtUrl)" :disabled="!builtUrl">复制</el-button>
          </div>
          <div class="built-url">{{ builtUrl || '—' }}</div>
        </div>
      </div>

      <p class="tool-tip">提示：encodeURIComponent 用于编码参数值；encodeURI 用于编码完整 URL；decodeURI 仅解码 %XX 但保留 <code>://?#[]@</code> 等保留字符。</p>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, Sort, Plus, Delete } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { copyText } from '@/utils/format'

const input = ref('')
const mode = ref('encode')
const func = ref('encodeURIComponent')
const error = ref('')

// 参数构建器状态
const baseUrl = ref('')
const params = ref([{ name: '', value: '' }])

const output = computed(() => {
  if (!input.value) { error.value = ''; return '' }
  try {
    error.value = ''
    if (mode.value === 'encode') {
      return func.value === 'encodeURIComponent'
        ? encodeURIComponent(input.value)
        : encodeURI(input.value)
    } else if (mode.value === 'decode') {
      return func.value === 'decodeURIComponent'
        ? decodeURIComponent(input.value)
        : decodeURI(input.value)
    }
    return ''
  } catch (e) {
    error.value = '解码失败：不是有效的 URL 编码字符串'
    return ''
  }
})

// URL 解析
const parsedUrl = computed(() => {
  if (!input.value) return null
  try {
    return new URL(input.value)
  } catch {
    return null
  }
})

const parsedFields = computed(() => {
  if (!parsedUrl.value) return []
  const u = parsedUrl.value
  return [
    { label: '协议 protocol', value: u.protocol },
    { label: '用户名 username', value: u.username },
    { label: '密码 password', value: u.password },
    { label: '主机 host', value: u.host },
    { label: '主机名 hostname', value: u.hostname },
    { label: '端口 port', value: u.port },
    { label: '路径 pathname', value: u.pathname },
    { label: '查询字符串 search', value: u.search },
    { label: '锚点 hash', value: u.hash },
    { label: '来源 origin', value: u.origin }
  ]
})

const queryPairs = computed(() => {
  if (!parsedUrl.value) return []
  const sp = parsedUrl.value.searchParams
  const arr = []
  sp.forEach((v, k) => arr.push({ name: k, value: v }))
  return arr
})

// 参数构建器输出
const builtUrl = computed(() => {
  const valid = params.value.filter((p) => p.name)
  if (!valid.length && !baseUrl.value) return ''
  const qs = valid.map((p) => encodeURIComponent(p.name) + '=' + encodeURIComponent(p.value)).join('&')
  if (!baseUrl.value) return qs
  return qs ? (baseUrl.value + (baseUrl.value.includes('?') ? '&' : '?') + qs) : baseUrl.value
})

function swap() {
  if (!output.value) return
  input.value = output.value
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
}

function clear() {
  input.value = ''
  error.value = ''
}

async function copy(text) {
  if (!text) return
  const ok = await copyText(text)
  ok ? ElMessage.success('已复制') : ElMessage.error('复制失败')
}
</script>

<style scoped>
.url-tool { display: flex; flex-direction: column; gap: 16px; }
.action-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.spacer { flex: 1; }
.func-select { display: flex; }
.tool-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.io-panel { display: flex; flex-direction: column; gap: 8px; }
.panel-header { display: flex; align-items: center; justify-content: space-between; }
.panel-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #303133); }
.error-msg { margin-top: 8px; }
.parsed-view { background: var(--color-surface, #fff); border: 1px solid var(--color-border, #ebeef5); border-radius: 8px; padding: 12px 16px; }
.parsed-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px dashed var(--color-border, #ebeef5); }
.parsed-row:last-child { border-bottom: none; }
.parsed-label { flex-shrink: 0; width: 140px; color: var(--color-text-secondary, #909399); font-size: 13px; }
.parsed-value { flex: 1; color: var(--color-text-primary, #303133); font-size: 13px; word-break: break-all; }
.parsed-value.empty { color: var(--color-text-placeholder, #c0c4cc); }
.parsed-value.mono { font-family: ui-monospace, 'SF Mono', Consolas, monospace; }
.parsed-eq { color: var(--color-text-secondary, #909399); }
.query-list { margin-top: 12px; }
.builder { display: flex; flex-direction: column; gap: 12px; }
.builder-url .el-input, .param-name, .param-value { width: 100%; }
.param-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.param-name { flex: 1; }
.param-eq { color: var(--color-text-secondary, #909399); }
.param-value { flex: 2; }
.builder-output .built-url { background: var(--color-bg, #f5f7fa); border: 1px solid var(--color-border, #ebeef5); border-radius: 6px; padding: 10px 12px; word-break: break-all; font-family: ui-monospace, monospace; font-size: 13px; color: var(--color-text-primary, #303133); }
.tool-tip { font-size: 12px; color: var(--color-text-secondary, #909399); margin: 0; line-height: 1.6; }
.tool-tip code { background: var(--color-primary-light, #ecf5ff); padding: 1px 5px; border-radius: 3px; font-size: 11px; }
@media (max-width: 768px) { .tool-row { grid-template-columns: 1fr; } .parsed-label { width: 100px; } }
</style>
