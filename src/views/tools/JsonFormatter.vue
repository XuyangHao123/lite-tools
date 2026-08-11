<template>
  <ToolLayout
    title="JSON 格式化"
    desc="免费在线 JSON 格式化、压缩、校验、转义、转 CSV/YAML、JSONPath 查询工具，支持容错排版与错误定位，开发者必备。"
    fav-key="json-formatter"
  >
    <div class="json-tool">
      <!-- 操作栏 -->
      <div class="action-bar">
        <el-button type="primary" @click="format" :disabled="!input">格式化</el-button>
        <el-button @click="minify" :disabled="!input">压缩</el-button>
        <el-button @click="validate" :disabled="!input">校验</el-button>
        <el-button @click="loadSample" :icon="Document">加载示例</el-button>
        <el-button @click="escapeJson" :disabled="!input">转义</el-button>
        <el-button @click="unescapeJson" :disabled="!input">反转义</el-button>
        <el-button @click="toCSV" :disabled="!input">转 CSV</el-button>
        <el-button @click="toYAML" :disabled="!input">转 YAML</el-button>
        <el-button @click="copyOutput" :disabled="!input" :icon="CopyDocument">复制</el-button>
        <el-button @click="clear">清空</el-button>
        <div class="indent-control">
          <span class="indent-label">缩进</span>
          <el-input-number v-model="indent" :min="1" :max="8" size="small" controls-position="right" />
        </div>
      </div>

      <!-- JSONPath 查询 -->
      <div class="action-bar jsonpath-bar">
        <span class="indent-label">JSONPath</span>
        <el-input v-model="jsonPath" placeholder="如 $.users[0].name 或 store.book[1].title" size="default" class="path-input" @keyup.enter="queryJsonPath" />
        <el-button type="primary" plain @click="queryJsonPath" :disabled="!input" :icon="Search">查询</el-button>
      </div>

      <!-- 单文本框：输入与格式化结果共用 -->
      <div class="io-panel">
        <div class="panel-title">
          JSON 文本
          <span v-if="errorPos" class="error-pos-tag">错误位置：第 {{ errorPos.line }} 行，第 {{ errorPos.column }} 列</span>
        </div>
        <el-input
          ref="textareaRef"
          v-model="input"
          type="textarea"
          :rows="20"
          placeholder='粘贴 JSON 文本，如 {"name":"test","value":123}'
          class="json-input"
          resize="vertical"
        />
      </div>

      <!-- 转换结果面板 -->
      <div class="transform-panel" v-if="transform">
        <div class="tree-header">
          <span class="panel-title">{{ transform.title }}</span>
          <el-button size="small" :icon="CopyDocument" @click="copyTransform">复制</el-button>
        </div>
        <el-input :model-value="transform.content" type="textarea" :rows="8" readonly class="json-input" />
      </div>

      <!-- 树形展示区：可按节点折叠 -->
      <div class="tree-panel">
        <div class="tree-header">
          <span class="panel-title">格式化结果（树形）</span>
          <div class="tree-actions" v-if="treeData">
            <el-input v-model="search" size="small" placeholder="搜索键/值（高亮）" class="search-input" :prefix-icon="Search" clearable />
            <el-button size="small" @click="expandAll">全部展开</el-button>
            <el-button size="small" @click="collapseAll">全部收起</el-button>
          </div>
        </div>
        <div class="tree-body" v-if="treeData">
          <JsonTree
            ref="treeRef"
            :data="treeData"
            :indent-size="indent"
            :default-expand="defaultExpand"
            :search="search"
            :path-enabled="true"
            node-path=""
          />
        </div>
        <div class="tree-placeholder" v-else>
          格式化成功后在此显示可折叠树形结构（点击键名或叶节点可复制路径，支持搜索高亮）
        </div>
      </div>

      <!-- 错误提示 -->
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        show-icon
        :closable="false"
      />
      <el-alert
        v-if="successMsg"
        :title="successMsg"
        type="success"
        show-icon
        :closable="false"
      />

      <p class="tool-tip">
        提示：格式化使 JSON 更易读，压缩去除空格减小体积。包含错误的 JSON 会按括号结构尽力排版并定位到首个错误处。树形视图中点击键名或叶节点值可复制其路径（如 a.b[0].c），支持搜索高亮。所有操作在浏览器本地完成。
      </p>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, nextTick, provide } from 'vue'
import { CopyDocument, Document, Search } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'
import JsonTree from '@/components/JsonTree.vue'
import { copyText } from '@/utils/format'

const input = ref('')
const error = ref('')
const successMsg = ref('')
const indent = ref(2)
const errorPos = ref(null)
const textareaRef = ref(null)
const treeData = ref(null)
const defaultExpand = ref(false)
const treeRef = ref(null)
const search = ref('')
const jsonPath = ref('')
const transform = ref(null) // { title, content }

// 注入给 JsonTree：点击节点复制路径
provide('__jsonTreeNotifyPath', async (path) => {
  const p = path || '$'
  const ok = await copyText(p)
  ok ? ElMessage.success('已复制路径：' + p) : ElMessage.error('复制失败，请手动复制')
})

function clearMessages() {
  error.value = ''
  successMsg.value = ''
  errorPos.value = null
}

/**
 * 从 JSON.parse 抛出的错误信息中提取字符偏移量。
 * V8 引擎的错误形如：Unexpected token X in JSON at position 12
 * 或：JSON.parse: expected ',' or '}' after property value in object at position 12
 * 老版本可能为：Unexpected token X (line 2 column 5)
 * 返回 0 起始的字符偏移量，无法解析时返回 -1。
 */
function extractErrorPosition(message) {
  let m = message.match(/at position (\d+)/)
  if (m) return Number(m[1])
  m = message.match(/line (\d+) column (\d+)/)
  if (m) {
    const line = Number(m[1])
    const column = Number(m[2])
    return { line, column }
  }
  return -1
}

/** 将字符偏移量转换为 1 起始的行列号 */
function offsetToLineColumn(text, offset) {
  if (offset < 0 || offset > text.length) return null
  let line = 1
  let column = 1
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++
      column = 1
    } else {
      column++
    }
  }
  return { line, column }
}

/** 将行列号转换为字符偏移量 */
function lineColumnToOffset(text, line, column) {
  let offset = 0
  let curLine = 1
  while (curLine < line && offset < text.length) {
    if (text[offset] === '\n') curLine++
    offset++
  }
  return offset + (column - 1)
}

/**
 * 容错格式化：不依赖完整解析，按字符串扫描大括号/中括号层级进行缩进。
 * 字符串、转义字符、布尔/数字字面量会被原样保留，仅调整空白与换行。
 * 遇到语法问题时停止排版并返回错误位置（字符偏移量）。
 * 返回 { text, errorOffset }：errorOffset 为 -1 表示无错误。
 */
function tolerantFormat(text, indentSize) {
  const indentStr = ' '.repeat(indentSize)
  let out = ''
  let depth = 0
  let i = 0
  const n = text.length
  let inString = false
  let stringStart = -1

  const pushIndent = () => {
    out += '\n' + indentStr.repeat(depth)
  }

  // 跳过空白并返回是否遇到非空白字符
  const skipWhitespace = () => {
    while (i < n && /\s/.test(text[i])) i++
  }

  while (i < n) {
    const ch = text[i]

    if (inString) {
      out += ch
      if (ch === '\\') {
        // 转义：保留下一个字符原样
        if (i + 1 < n) {
          out += text[i + 1]
          i += 2
          continue
        }
        i++
        continue
      }
      if (ch === '"') {
        inString = false
        i++
        continue
      }
      i++
      continue
    }

    // 非字符串状态
    if (ch === '"') {
      inString = true
      stringStart = i
      out += ch
      i++
      continue
    }

    if (ch === '{' || ch === '[') {
      out += ch
      depth++
      // 查看下一个非空白字符，决定是否换行
      let j = i + 1
      while (j < n && /\s/.test(text[j])) j++
      if (j < n && text[j] !== '}' && text[j] !== ']') {
        pushIndent()
      } else if (j < n && (text[j] === '}' || text[j] === ']')) {
        // 空对象/数组，保持同行
      }
      i++
      continue
    }

    if (ch === '}' || ch === ']') {
      depth = Math.max(0, depth - 1)
      // 若上一字符非换行，则先换行缩进
      if (out.length && out[out.length - 1] !== '\n') {
        pushIndent()
      }
      out += ch
      i++
      continue
    }

    if (ch === ',') {
      out += ch
      pushIndent()
      i++
      continue
    }

    if (ch === ':') {
      out += ': '
      i++
      // 跳过冒号后多余空白
      while (i < n && /\s/.test(text[i]) && text[i] !== '\n') i++
      continue
    }

    if (/\s/.test(ch)) {
      i++
      continue
    }

    // 其他字符（数字、布尔、null 等字面量）原样输出，直到遇到结构字符或空白
    let literal = ''
    while (i < n && !/[\{\}\[\],:"\s]/.test(text[i])) {
      literal += text[i]
      i++
    }
    out += literal
  }

  // 字符串未闭合
  if (inString) {
    return { text: out, errorOffset: stringStart }
  }

  // 括号不匹配
  if (depth !== 0) {
    return { text: out, errorOffset: n }
  }

  return { text: out, errorOffset: -1 }
}

/** 定位光标到错误位置 */
async function focusError(offset) {
  if (offset < 0 || offset > input.value.length) return
  await nextTick()
  const el = textareaRef.value?.$el?.querySelector('textarea') || textareaRef.value?.$el
  if (!el || typeof el.setSelectionRange !== 'function') return
  el.focus()
  // 选中错误位置前后各 1 个字符，便于用户快速定位
  const start = Math.max(0, offset)
  const end = Math.min(input.value.length, offset + 1)
  try {
    el.setSelectionRange(start, end)
  } catch {
    // 部分浏览器在隐藏元素上设置选区会抛错，忽略
  }
}

/** 格式化 */
function format() {
  clearMessages()
  if (!input.value.trim()) return

  // 先尝试标准解析
  try {
    const parsed = JSON.parse(input.value)
    input.value = JSON.stringify(parsed, null, indent.value)
    treeData.value = parsed
    successMsg.value = '格式化成功'
    return
  } catch (e) {
    // 进入容错排版分支（JSON 有错时无法构建树）
    treeData.value = null
    const msg = e.message || String(e)
    const pos = extractErrorPosition(msg)
    const { text: formatted, errorOffset } = tolerantFormat(input.value, indent.value)

    // 容错排版结果写入文本框
    input.value = formatted

    // 计算错误位置：优先使用引擎给出的偏移量，其次使用容错排版检测到的偏移量
    let offset = -1
    if (typeof pos === 'number' && pos >= 0) {
      offset = pos
    } else if (pos && typeof pos === 'object') {
      offset = lineColumnToOffset(formatted, pos.line, pos.column)
    } else if (errorOffset >= 0) {
      offset = errorOffset
    }

    if (offset >= 0) {
      const lc = offsetToLineColumn(formatted, offset)
      errorPos.value = lc
      error.value = `JSON 解析错误：${msg}`
      focusError(offset)
    } else {
      error.value = `JSON 解析错误：${msg}（已按括号结构尽力排版）`
    }
  }
}

/** 压缩 */
function minify() {
  clearMessages()
  if (!input.value.trim()) return
  try {
    const parsed = JSON.parse(input.value)
    input.value = JSON.stringify(parsed)
    treeData.value = parsed
    successMsg.value = '压缩成功'
  } catch (e) {
    treeData.value = null
    const msg = e.message || String(e)
    error.value = `JSON 解析错误：${msg}`
    const pos = extractErrorPosition(msg)
    if (typeof pos === 'number' && pos >= 0) {
      focusError(pos)
      errorPos.value = offsetToLineColumn(input.value, pos)
    } else if (pos && typeof pos === 'object') {
      const offset = lineColumnToOffset(input.value, pos.line, pos.column)
      focusError(offset)
      errorPos.value = pos
    }
  }
}

/** 校验 */
function validate() {
  clearMessages()
  if (!input.value.trim()) return
  try {
    JSON.parse(input.value)
    successMsg.value = '✓ JSON 格式正确'
  } catch (e) {
    const msg = e.message || String(e)
    error.value = `JSON 解析错误：${msg}`
    const pos = extractErrorPosition(msg)
    if (typeof pos === 'number' && pos >= 0) {
      focusError(pos)
      errorPos.value = offsetToLineColumn(input.value, pos)
    } else if (pos && typeof pos === 'object') {
      const offset = lineColumnToOffset(input.value, pos.line, pos.column)
      focusError(offset)
      errorPos.value = pos
    }
  }
}

/** 转义：将文本作为 JSON 字符串内容转义 */
function escapeJson() {
  clearMessages()
  if (!input.value) return
  try {
    input.value = JSON.stringify(input.value).slice(1, -1)
    successMsg.value = '转义完成'
  } catch (e) {
    error.value = '转义失败：' + (e.message || String(e))
  }
}

/** 反转义：将转义文本还原 */
function unescapeJson() {
  clearMessages()
  if (!input.value) return
  try {
    input.value = JSON.parse('"' + input.value + '"')
    successMsg.value = '反转义完成'
  } catch (e) {
    error.value = '反转义失败：输入不是合法的 JSON 转义字符串'
  }
}

/** 转 CSV：仅支持对象数组 */
function toCSV() {
  clearMessages()
  if (!input.value.trim()) return
  let parsed
  try {
    parsed = JSON.parse(input.value)
  } catch (e) {
    error.value = 'JSON 解析错误：' + (e.message || String(e))
    return
  }
  if (!Array.isArray(parsed) || !parsed.length || typeof parsed[0] !== 'object' || Array.isArray(parsed[0])) {
    error.value = '转 CSV 需为对象数组（如 [{...},{...}]）'
    return
  }
  const keys = []
  for (const item of parsed) {
    for (const k of Object.keys(item)) if (!keys.includes(k)) keys.push(k)
  }
  const cell = (v) => {
    let s = v === null || v === undefined ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v))
    if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const lines = [keys.map(cell).join(',')]
  for (const item of parsed) {
    lines.push(keys.map((k) => cell(item[k])).join(','))
  }
  transform.value = { title: 'CSV 转换结果', content: lines.join('\n') }
  successMsg.value = '已转换为 CSV'
}

/** 转 YAML：简单实现 */
function toYAML() {
  clearMessages()
  if (!input.value.trim()) return
  let parsed
  try {
    parsed = JSON.parse(input.value)
  } catch (e) {
    error.value = 'JSON 解析错误：' + (e.message || String(e))
    return
  }
  const fmt = (v) => {
    if (v === null) return 'null'
    if (typeof v === 'string') return /[:#\-\[\]\{\},&\*!\|>'"%@`]/.test(v) || /^\s|\s$/.test(v) ? JSON.stringify(v) : v
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }
  const serialize = (obj, depth = 0) => {
    const pad = '  '.repeat(depth)
    if (obj === null) return pad + 'null'
    if (Array.isArray(obj)) {
      if (!obj.length) return pad + '[]'
      return obj.map((item) => {
        if (item !== null && typeof item === 'object') {
          const sub = serialize(item, depth + 1).trimStart()
          return pad + '- ' + sub
        }
        return pad + '- ' + fmt(item)
      }).join('\n')
    }
    if (typeof obj === 'object') {
      const keys = Object.keys(obj)
      if (!keys.length) return pad + '{}'
      return keys.map((k) => {
        const v = obj[k]
        if (v !== null && typeof v === 'object') {
          return pad + k + ':\n' + serialize(v, depth + 1)
        }
        return pad + k + ': ' + fmt(v)
      }).join('\n')
    }
    return pad + fmt(obj)
  }
  transform.value = { title: 'YAML 转换结果', content: serialize(parsed) }
  successMsg.value = '已转换为 YAML'
}

/** JSONPath 查询：支持 $.a.b[0].c / ["key"] 语法 */
function evalJsonPath(obj, path) {
  let p = path.trim()
  if (p.startsWith('$')) p = p.slice(1)
  if (p.startsWith('.')) p = p.slice(1)
  let cur = obj
  const re = /\.([A-Za-z_$][\w$]*)|\[(\d+)\]|\["([^"]*)"\]|\['([^']*)'\]/g
  let m
  while ((m = re.exec(p)) !== null) {
    if (cur == null || typeof cur !== 'object') return undefined
    if (m[1] != null) cur = cur[m[1]]
    else if (m[2] != null) cur = Array.isArray(cur) ? cur[Number(m[2])] : undefined
    else if (m[3] != null) cur = cur[m[3]]
    else if (m[4] != null) cur = cur[m[4]]
  }
  return cur
}

function queryJsonPath() {
  clearMessages()
  if (!input.value.trim() || !jsonPath.value.trim()) return
  let parsed
  try {
    parsed = JSON.parse(input.value)
  } catch (e) {
    error.value = 'JSON 解析错误：' + (e.message || String(e))
    return
  }
  try {
    const result = evalJsonPath(parsed, jsonPath.value)
    if (result === undefined) {
      error.value = '未查询到结果，请检查路径'
      transform.value = null
      return
    }
    const content = typeof result === 'object' ? JSON.stringify(result, null, indent.value) : String(result)
    transform.value = { title: 'JSONPath 查询结果', content }
    successMsg.value = '查询成功'
  } catch (e) {
    error.value = '查询失败：' + (e.message || String(e))
  }
}

const SAMPLE = `{
  "name": "示例 JSON",
  "version": "1.0",
  "active": true,
  "tags": ["json", "format", "tool"],
  "author": {
    "name": "张三",
    "email": "zhangsan@example.com"
  },
  "stats": {
    "users": 1024,
    "requests": 98765
  },
  "store": {
    "book": [
      { "category": "reference", "price": 12.5, "title": "JavaScript 指南" },
      { "category": "fiction", "price": 8.9, "title": "Vue 实战" }
    ]
  }
}`

function loadSample() {
  clearMessages()
  input.value = SAMPLE
  try {
    treeData.value = JSON.parse(SAMPLE)
    successMsg.value = '已加载示例'
  } catch {
    treeData.value = null
  }
}

async function copyOutput() {
  if (!input.value) return
  const ok = await copyText(input.value)
  ok ? ElMessage.success('已复制到剪贴板') : ElMessage.error('复制失败，请手动复制')
}

async function copyTransform() {
  if (!transform.value) return
  const ok = await copyText(transform.value.content)
  ok ? ElMessage.success('已复制') : ElMessage.error('复制失败，请手动复制')
}

function clear() {
  input.value = ''
  treeData.value = null
  transform.value = null
  search.value = ''
  jsonPath.value = ''
  clearMessages()
}

/** 全部展开：通过切换 defaultExpand 触发 watch 重置，再调用 setAll 兜底 */
function expandAll() {
  defaultExpand.value = true
  nextTick(() => treeRef.value?.setAll(true))
}

/** 全部收起 */
function collapseAll() {
  defaultExpand.value = false
  nextTick(() => treeRef.value?.setAll(false))
}
</script>

<style scoped>
.json-tool {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.jsonpath-bar {
  gap: 6px;
}
.path-input { flex: 1; min-width: 200px; }

.indent-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.indent-label {
  font-size: 13px;
  color: var(--color-text-regular, #606266);
}

.io-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary, #303133);
  display: flex;
  align-items: center;
  gap: 12px;
}

.error-pos-tag {
  font-size: 12px;
  font-weight: 500;
  color: #f56c6c;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 4px;
  padding: 2px 8px;
}

.json-input :deep(textarea) {
  font-family: 'Courier New', Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
}

.transform-panel {
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: 6px;
  background: var(--color-bg, #fafafa);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tree-panel {
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: 6px;
  background: var(--color-bg, #fafafa);
  overflow: hidden;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border, #ebeef5);
  background: var(--color-surface, #fff);
  gap: 8px;
  flex-wrap: wrap;
}

.tree-header .panel-title {
  margin: 0;
}

.tree-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input { width: 200px; }

.tree-body {
  padding: 12px 14px;
  max-height: 480px;
  overflow: auto;
  font-family: 'Courier New', Consolas, monospace;
}

.tree-placeholder {
  padding: 24px 14px;
  color: var(--color-text-placeholder, #c0c4cc);
  font-size: 13px;
  text-align: center;
}

.tool-tip {
  font-size: 12px;
  color: var(--color-text-secondary, #909399);
  margin: 0;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .indent-control {
    margin-left: 0;
  }
  .search-input { width: 100%; }
}
</style>
