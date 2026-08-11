<template>
  <ToolLayout
    title="代码压缩"
    desc="免费在线 HTML/CSS/JS/JSON/XML/SVG 代码压缩工具，安全 token 化保护字符串/正则/注释，去除注释和多余空格，本地处理。"
    fav-key="code-minifier"
  >
    <div class="code-minifier">
      <!-- 类型选择 -->
      <el-radio-group v-model="lang" class="lang-tabs">
        <el-radio-button value="html">HTML</el-radio-button>
        <el-radio-button value="css">CSS</el-radio-button>
        <el-radio-button value="js">JS</el-radio-button>
        <el-radio-button value="json">JSON</el-radio-button>
        <el-radio-button value="xml">XML</el-radio-button>
        <el-radio-button value="svg">SVG</el-radio-button>
      </el-radio-group>

      <!-- 输入 -->
      <div class="io-panel">
        <label class="config-title">输入代码</label>
        <el-input v-model="input" type="textarea" :rows="10" :placeholder="`粘贴 ${langLabel} 代码`" class="code-input" />
      </div>

      <!-- 选项 -->
      <div class="options-row">
        <el-checkbox v-model="removeComments">移除注释</el-checkbox>
        <el-checkbox v-model="removeWhitespace">移除多余空格</el-checkbox>
        <el-checkbox v-model="keepNewlines" :disabled="!removeWhitespace">保留换行（仅去行内多余空格）</el-checkbox>
      </div>

      <!-- 操作 -->
      <div class="action-bar">
        <el-button type="primary" @click="minify" :disabled="!input" :loading="loading">压缩</el-button>
        <el-button @click="copyOutput" :disabled="!output" :icon="CopyDocument">复制结果</el-button>
        <el-button @click="downloadOutput" :disabled="!output" :icon="Download">下载文件</el-button>
        <el-button @click="clear" :disabled="!input && !output">清空</el-button>
      </div>

      <!-- 错误 -->
      <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />

      <!-- 输出 -->
      <div class="io-panel" v-if="output">
        <div class="output-header">
          <label class="config-title">压缩结果</label>
          <div class="size-compare">
            <el-tag size="small" type="info">{{ formatSize(inBytes) }}</el-tag>
            <el-icon><Right /></el-icon>
            <el-tag size="small" type="success">{{ formatSize(outBytes) }}</el-tag>
            <el-tag v-if="reduction > 0" size="small" type="success">-{{ reduction }}%</el-tag>
          </div>
        </div>
        <el-input v-model="output" type="textarea" :rows="6" readonly class="code-input" />
      </div>

      <p class="tool-tip">
        提示：JS 压缩采用安全 token 化——先识别字符串、正则字面量、注释并替换为占位符，再压缩代码空白，最后还原，避免字符串内 <code>//</code> 与空格被误删；并保留 <code>/*! 版权注释 */</code>。
      </p>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CopyDocument, Download, Right } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { formatSize, copyText } from '@/utils/format'
import { downloadBlob } from '@/composables/useDownload'

const lang = ref('js')
const input = ref('')
const output = ref('')
const removeComments = ref(true)
const removeWhitespace = ref(true)
const keepNewlines = ref(false)
const loading = ref(false)
const error = ref('')

const langLabel = computed(() => ({ html: 'HTML', css: 'CSS', js: 'JavaScript', json: 'JSON', xml: 'XML', svg: 'SVG' }[lang.value]))

const inBytes = computed(() => input.value ? new TextEncoder().encode(input.value).length : 0)
const outBytes = computed(() => output.value ? new TextEncoder().encode(output.value).length : 0)
const reduction = computed(() => {
  if (!input.value || !output.value || inBytes.value === 0) return 0
  return Math.max(0, Math.round((1 - outBytes.value / inBytes.value) * 100))
})

/* ====================== JS 安全压缩 ====================== */
// 正则前置关键字（其后 '/' 视为正则而非除号）
const REGEX_KW = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'yield',
  'do', 'else', 'case', 'throw', 'if', 'while', 'for', 'switch', 'await',
  'extends', 'implements', 'package', 'import', 'export', 'default'
])

// 占位符边界字符（NUL），不影响 \w 判定
const PH = '\u0000'

function tokenizeJS(code) {
  const tokens = [] // { type: 'code'|'string'|'regex'|'comment', value, preserve? }
  let i = 0
  const n = code.length
  let prevType = 'start' // 'start' | 'value' | 'op'

  const isRegexCtx = () => prevType === 'start' || prevType === 'op'

  while (i < n) {
    const ch = code[i]

    // 空白
    if (/\s/.test(ch)) {
      let j = i
      while (j < n && /\s/.test(code[j])) j++
      tokens.push({ type: 'code', value: code.slice(i, j) })
      i = j
      continue
    }
    // 行注释
    if (ch === '/' && code[i + 1] === '/') {
      let j = i + 2
      while (j < n && code[j] !== '\n') j++
      tokens.push({ type: 'comment', value: code.slice(i, j) })
      i = j
      continue
    }
    // 块注释
    if (ch === '/' && code[i + 1] === '*') {
      let j = i + 2
      while (j < n && !(code[j] === '*' && code[j + 1] === '/')) j++
      j = Math.min(n, j + 2)
      const val = code.slice(i, j)
      const preserve = val.startsWith('/*!') || /@license|@preserve/i.test(val)
      tokens.push({ type: 'comment', value: val, preserve })
      i = j
      continue
    }
    // 字符串（含模板字面量，简单处理 ${}）
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch
      let j = i + 1
      while (j < n) {
        const c = code[j]
        if (c === '\\') { j += 2; continue }
        if (c === q) { j++; break }
        if (q === '`' && c === '$' && code[j + 1] === '{') {
          let depth = 1; j += 2
          while (j < n && depth > 0) {
            if (code[j] === '\\') { j += 2; continue }
            if (code[j] === '{') depth++
            else if (code[j] === '}') depth--
            j++
          }
          continue
        }
        j++
      }
      tokens.push({ type: 'string', value: code.slice(i, j) })
      i = j
      prevType = 'value'
      continue
    }
    // 正则字面量
    if (ch === '/' && isRegexCtx()) {
      let j = i + 1
      let inClass = false
      let closed = false
      while (j < n) {
        const c = code[j]
        if (c === '\n') break
        if (c === '\\') { j += 2; continue }
        if (c === '[') inClass = true
        else if (c === ']') inClass = false
        else if (c === '/' && !inClass) { closed = true; j++; break }
        j++
      }
      if (closed) {
        let k = j
        while (k < n && /[gimsuy]/.test(code[k])) k++
        tokens.push({ type: 'regex', value: code.slice(i, k) })
        i = k
        prevType = 'value'
        continue
      }
      // 未闭合 → 视为除号，落入 code
    }
    // 标识符 / 关键字
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1
      while (j < n && /[\w$]/.test(code[j])) j++
      const word = code.slice(i, j)
      tokens.push({ type: 'code', value: word })
      i = j
      prevType = REGEX_KW.has(word) ? 'op' : 'value'
      continue
    }
    // 数字
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(code[i + 1] || ''))) {
      let j = i
      while (j < n && /[\w.]/.test(code[j])) j++
      tokens.push({ type: 'code', value: code.slice(i, j) })
      i = j
      prevType = 'value'
      continue
    }
    // 标点 / 运算符
    tokens.push({ type: 'code', value: ch })
    i++
    prevType = (ch === ')' || ch === ']') ? 'value' : 'op'
  }
  return tokens
}

function minifyJS(code, opts) {
  const tokens = tokenizeJS(code)
  const placeholders = []
  let skeleton = ''
  for (const t of tokens) {
    if (t.type === 'comment') {
      if (opts.removeComments && !t.preserve) continue
      // 保留的版权注释也用占位符保护（避免被空白规则影响）
      const idx = placeholders.length
      placeholders.push(t.value)
      skeleton += PH + idx + PH
    } else if (t.type === 'string' || t.type === 'regex') {
      const idx = placeholders.length
      placeholders.push(t.value)
      skeleton += PH + idx + PH
    } else {
      skeleton += t.value
    }
  }
  skeleton = collapseWS(skeleton, opts)
  // 还原
  return skeleton.replace(new RegExp(PH + '(\\d+)' + PH, 'g'), (_, i) => placeholders[Number(i)])
}

/* ====================== CSS 压缩 ====================== */
function minifyCSS(code, opts) {
  const placeholders = []
  let skeleton = ''
  let i = 0
  const n = code.length
  while (i < n) {
    const ch = code[i]
    // 注释
    if (ch === '/' && code[i + 1] === '*') {
      let j = i + 2
      while (j < n && !(code[j] === '*' && code[j + 1] === '/')) j++
      j = Math.min(n, j + 2)
      const val = code.slice(i, j)
      const preserve = val.startsWith('/*!') || /@license|@preserve/i.test(val)
      if (opts.removeComments && !preserve) { i = j; continue }
      if (preserve) {
        const idx = placeholders.length
        placeholders.push(val)
        skeleton += PH + idx + PH
        i = j
        continue
      }
      i = j
      continue
    }
    // 字符串
    if (ch === '"' || ch === "'") {
      const q = ch
      let j = i + 1
      while (j < n) {
        if (code[j] === '\\') { j += 2; continue }
        if (code[j] === q) { j++; break }
        j++
      }
      const idx = placeholders.length
      placeholders.push(code.slice(i, j))
      skeleton += PH + idx + PH
      i = j
      continue
    }
    skeleton += ch
    i++
  }
  skeleton = collapseWS(skeleton, opts)
  // CSS 专属：去除 } 前多余的 ;
  skeleton = skeleton.replace(/;}/g, '}')
  return skeleton.replace(new RegExp(PH + '(\\d+)' + PH, 'g'), (_, i) => placeholders[Number(i)])
}

/* ====================== HTML/SVG/XML 压缩 ====================== */
function minifyMarkup(code, opts, isXml) {
  const placeholders = []
  let skeleton = ''
  let i = 0
  const n = code.length

  // 保护 <pre>/<textarea>/<script>/<style> 内容（XML/SVG 同样可能含 <style>）
  const protectTags = ['pre', 'textarea', 'script', 'style']
  while (i < n) {
    const ch = code[i]
    // 注释
    if (!isXml && ch === '<' && code[i + 1] === '!' && code[i + 2] === '-' && code[i + 3] === '-') {
      let j = i + 4
      while (j < n && !(code[j] === '-' && code[j + 1] === '-' && code[j + 2] === '>')) j++
      j = Math.min(n, j + 3)
      if (opts.removeComments) { i = j; continue }
      const idx = placeholders.length
      placeholders.push(code.slice(i, j))
      skeleton += PH + idx + PH
      i = j
      continue
    }
    // XML 注释 <!-- -->
    if (isXml && ch === '<' && code[i + 1] === '!' && code[i + 2] === '-' && code[i + 3] === '-') {
      let j = i + 4
      while (j < n && !(code[j] === '-' && code[j + 1] === '-' && code[j + 2] === '>')) j++
      j = Math.min(n, j + 3)
      if (opts.removeComments) { i = j; continue }
      const idx = placeholders.length
      placeholders.push(code.slice(i, j))
      skeleton += PH + idx + PH
      i = j
      continue
    }
    // CDATA
    if (ch === '<' && code.substr(i, 9) === '<![CDATA[') {
      let j = i + 9
      while (j < n && code.substr(j, 3) !== ']]>') j++
      j = Math.min(n, j + 3)
      const idx = placeholders.length
      placeholders.push(code.slice(i, j))
      skeleton += PH + idx + PH
      i = j
      continue
    }
    // 保护标签内容
    if (ch === '<') {
      let matched = false
      for (const tag of protectTags) {
        const open = '<' + tag
        if (code.substr(i, open.length).toLowerCase() === open.toLowerCase()) {
          // 找到对应闭合
          const close = '</' + tag
          let end = code.toLowerCase().indexOf(close, i + open.length)
          if (end === -1) { matched = false; break }
          let j = end + close.length
          while (j < n && code[j] !== '>') j++
          j++
          let inner = code.slice(i, j)
          // 对 script/style 内部做对应压缩
          if (!isXml && (tag === 'script' || tag === 'style')) {
            const innerStart = i + code.substr(i).indexOf('>') + 1
            const innerEnd = end
            const head = code.slice(i, innerStart)
            const body = code.slice(innerStart, innerEnd)
            const tail = code.slice(innerEnd, j)
            const minBody = tag === 'script' ? minifyJS(body, opts) : minifyCSS(body, opts)
            inner = head + minBody + tail
          }
          const idx = placeholders.length
          placeholders.push(inner)
          skeleton += PH + idx + PH
          i = j
          matched = true
          break
        }
      }
      if (matched) continue
    }
    skeleton += ch
    i++
  }

  skeleton = collapseWS(skeleton, opts)
  // 标签间空白：> < 之间多余空白压缩已在 collapseWS 处理；去掉 > 与 < 间空格
  skeleton = skeleton.replace(/>\s+</g, '><')
  return skeleton.replace(new RegExp(PH + '(\\d+)' + PH, 'g'), (_, i) => placeholders[Number(i)])
}

/* ====================== JSON 压缩 ====================== */
function minifyJSON(code, opts) {
  const parsed = JSON.parse(code) // 抛错由上层捕获
  if (opts.removeWhitespace && !opts.keepNewlines) return JSON.stringify(parsed)
  if (opts.keepNewlines) return JSON.stringify(parsed, null, 1)
  return JSON.stringify(parsed, null, 2)
}

/* 通用空白压缩（作用于 skeleton，已不含被保护内容） */
function collapseWS(s, opts) {
  if (!opts.removeWhitespace) {
    return opts.removeComments ? s : s
  }
  if (opts.keepNewlines) {
    s = s.replace(/[ \t\f\v]+/g, ' ')       // 行内空白→单空格
    s = s.replace(/ ?\n ?/g, '\n')          // 换行前后空格去除
    s = s.replace(/\n{2,}/g, '\n')         // 多空行→单行
    s = s.trim()
  } else {
    s = s.replace(/\s+/g, ' ').trim()
  }
  // 仅当两侧均为「标识符或占位符」字符时保留空格，否则移除
  const keep = (c) => /[\w$]/.test(c) || c === PH
  let out = ''
  for (let k = 0; k < s.length; k++) {
    const c = s[k]
    if (c === ' ') {
      const prev = s[k - 1]
      const next = s[k + 1]
      if (prev && next && keep(prev) && keep(next)) out += ' '
      // 否则丢弃空格
    } else {
      out += c
    }
  }
  return out
}

function minify() {
  if (!input.value) return
  loading.value = true
  error.value = ''
  try {
    const opts = {
      removeComments: removeComments.value,
      removeWhitespace: removeWhitespace.value,
      keepNewlines: keepNewlines.value
    }
    let result
    switch (lang.value) {
      case 'html': result = minifyMarkup(input.value, opts, false); break
      case 'css': result = minifyCSS(input.value, opts); break
      case 'js': result = minifyJS(input.value, opts); break
      case 'json': result = minifyJSON(input.value, opts); break
      case 'xml': result = minifyMarkup(input.value, opts, true); break
      case 'svg': result = minifyMarkup(input.value, opts, true); break
      default: result = input.value
    }
    output.value = result
    ElMessage.success('压缩完成')
  } catch (e) {
    error.value = '压缩失败：' + (e.message || String(e))
    output.value = ''
  } finally {
    loading.value = false
  }
}

async function copyOutput() {
  if (!output.value) return
  const ok = await copyText(output.value)
  ok ? ElMessage.success('已复制') : ElMessage.error('复制失败，请手动复制')
}

function downloadOutput() {
  if (!output.value) return
  const ext = { html: 'html', css: 'css', js: 'js', json: 'json', xml: 'xml', svg: 'svg' }[lang.value] || 'txt'
  const blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' })
  downloadBlob(blob, `minified.${ext}`)
}

function clear() { input.value = ''; output.value = ''; error.value = '' }
</script>

<style scoped>
.code-minifier { display: flex; flex-direction: column; gap: 16px; }
.lang-tabs { flex-wrap: wrap; }
.io-panel { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #303133); }
.code-input :deep(textarea) { font-family: 'Courier New', Consolas, monospace; font-size: 13px; line-height: 1.5; }
.options-row { display: flex; gap: 16px; flex-wrap: wrap; }
.action-bar { display: flex; gap: 8px; flex-wrap: wrap; }
.output-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.size-compare { display: flex; align-items: center; gap: 4px; }
.tool-tip { font-size: 12px; color: var(--color-text-secondary, #909399); margin: 0; line-height: 1.6; }
.tool-tip code { background: var(--color-primary-light, #ecf5ff); padding: 1px 5px; border-radius: 3px; font-size: 11px; }
</style>
