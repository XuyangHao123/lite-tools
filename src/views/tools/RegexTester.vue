<template>
  <ToolLayout
    title="正则表达式测试"
    desc="免费在线正则表达式测试工具，支持实时匹配、高亮、分组与命名分组捕获、替换预览，本地处理。"
    fav-key="regex-tester"
  >
    <div class="regex-tool">
      <!-- 正则输入 -->
      <div class="regex-input-section">
        <div class="regex-row">
          <span class="regex-slash">/</span>
          <el-input v-model="pattern" placeholder="输入正则表达式" size="large" class="regex-pattern" />
          <span class="regex-slash">/</span>
          <el-input v-model="flags" placeholder="gimsuy" size="large" class="regex-flags" />
        </div>
        <div class="flag-hints">
          <el-tag v-for="f in flagList" :key="f.key" size="small"
            :type="flags.includes(f.key) ? 'primary' : 'info'"
            class="flag-tag" @click="toggleFlag(f.key)">
            {{ f.label }}
          </el-tag>
        </div>
      </div>

      <!-- 测试文本 -->
      <div class="config-section">
        <label class="config-title">测试文本</label>
        <el-input v-model="testText" type="textarea" :rows="6" placeholder="输入要匹配的文本" />
      </div>

      <!-- 原文高亮 -->
      <div v-if="testText && regexOk && highlightHtml" class="config-section">
        <label class="config-title">原文高亮（<mark>标记匹配位置</mark>）</label>
        <div class="highlight-box" v-html="highlightHtml"></div>
      </div>

      <!-- 替换 -->
      <div class="config-section">
        <label class="config-title">替换模板（支持 {{ '$1 $& $<name>' }} 等）</label>
        <el-input v-model="replacement" placeholder="如 $1 替换为第一个分组" />
        <div v-if="replacement && regexOk && replacedText !== null" class="replace-result">
          <span class="replace-label">替换结果：</span>
          <code class="replace-value">{{ replacedText }}</code>
          <el-button :icon="CopyDocument" size="small" @click="copyText2(replacedText)" />
        </div>
      </div>

      <!-- 错误 -->
      <div v-if="error" class="error-msg"><el-alert :title="error" type="error" show-icon :closable="false" /></div>

      <!-- 匹配结果 -->
      <div v-if="matches.length && !error" class="result-section">
        <div class="match-summary">
          <el-tag type="success" size="large">匹配到 {{ matches.length }} 个结果</el-tag>
          <el-button :icon="CopyDocument" size="small" @click="copyText2(matches.map((m) => m.value).join('\n'))">复制匹配结果</el-button>
          <el-button :icon="CopyDocument" size="small" @click="copyText2(`/${pattern}/${flags}`)">复制正则</el-button>
        </div>
        <div class="match-list">
          <div v-for="(m, i) in matches" :key="i" class="match-item">
            <span class="match-index">#{{ i + 1 }}</span>
            <code class="match-value">{{ m.value }}</code>
            <span class="match-pos">位置 {{ m.index }}</span>
            <div v-if="m.groups && m.groups.length" class="match-groups">
              <el-tag v-for="(g, gi) in m.groups" :key="gi" size="small" type="info" class="group-tag">
                ${{ gi + 1 }}: {{ g !== undefined ? g : '(空)' }}
              </el-tag>
            </div>
            <div v-if="m.named" class="match-groups">
              <el-tag v-for="(v, name) in m.named" :key="name" size="small" type="warning" class="group-tag">
                $&lt;{{ name }}&gt;: {{ v !== undefined ? v : '(空)' }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!matches.length && testText && pattern && !error" class="no-match">
        <el-alert title="无匹配结果" type="warning" show-icon :closable="false" />
      </div>

      <!-- 常用正则 -->
      <div class="preset-section">
        <h3 class="section-title">常用正则</h3>
        <div class="preset-list">
          <el-button v-for="p in presets" :key="p.name" size="small" @click="usePreset(p)">{{ p.name }}</el-button>
        </div>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CopyDocument } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { copyText } from '@/utils/format'

const pattern = ref('')
const flags = ref('g')
const testText = ref('')
const replacement = ref('')
const error = ref('')

const flagList = [
  { key: 'g', label: 'g 全局' },
  { key: 'i', label: 'i 忽略大小写' },
  { key: 'm', label: 'm 多行' },
  { key: 's', label: 's 全点匹配(dotAll)' },
  { key: 'u', label: 'u Unicode' },
  { key: 'y', label: 'y 粘性(sticky)' }
]

const presets = [
  { name: '邮箱', pattern: '[\\w.+-]+@[\\w.-]+\\.\\w+', flags: 'g' },
  { name: '手机号', pattern: '1[3-9]\\d{9}', flags: 'g' },
  { name: 'URL', pattern: 'https?://[\\w./?=&%#-]+', flags: 'g' },
  { name: 'IP地址', pattern: '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}', flags: 'g' },
  { name: '身份证', pattern: '\\d{17}[\\dXx]', flags: 'g' },
  { name: '日期', pattern: '\\d{4}-\\d{2}-\\d{2}', flags: 'g' },
  { name: '邮编', pattern: '[1-9]\\d{5}(?!\\d)', flags: 'g' },
  { name: '车牌', pattern: '[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-HJ-NP-Z0-9]{6}', flags: 'g' },
  { name: '微信号', pattern: '^[a-zA-Z][-_a-zA-Z0-9]{5,19}$', flags: '' },
  { name: '银行卡', pattern: '\\d{16,19}', flags: 'g' },
  { name: '座机', pattern: '\\d{3,4}-\\d{7,8}', flags: 'g' },
  { name: 'QQ号', pattern: '[1-9]\\d{4,10}', flags: 'g' }
]

function toggleFlag(flag) {
  if (flags.value.includes(flag)) {
    flags.value = flags.value.replace(new RegExp(flag, 'g'), '')
  } else {
    flags.value += flag
  }
}

function usePreset(p) {
  pattern.value = p.pattern
  flags.value = p.flags
}

// 构造正则（带错误捕获）
const regexObj = computed(() => {
  if (!pattern.value) { error.value = ''; return null }
  try {
    // 去重标志位，避免重复导致报错
    const fl = [...new Set(flags.value.split(''))].join('')
    const re = new RegExp(pattern.value, fl)
    error.value = ''
    return re
  } catch (e) {
    error.value = '正则表达式错误：' + e.message
    return null
  }
})

const regexOk = computed(() => regexObj.value !== null)

const matches = computed(() => {
  const re = regexObj.value
  if (!re || !testText.value) return []
  const result = []
  try {
    const isGlobal = re.global
    const isSticky = re.sticky
    // 重置游标，避免 regex 实例未重建时残留 lastIndex 导致漏匹配
    re.lastIndex = 0
    if (isGlobal || isSticky) {
      let m
      let count = 0
      while ((m = re.exec(testText.value)) !== null) {
        result.push({
          value: m[0],
          index: m.index,
          groups: m.slice(1),
          named: m.groups || null
        })
        count++
        if (count > 200) break
        if (m.index === re.lastIndex) re.lastIndex++ // 防止零宽匹配死循环
      }
    } else {
      const m = re.exec(testText.value)
      if (m) {
        result.push({ value: m[0], index: m.index, groups: m.slice(1), named: m.groups || null })
      }
    }
  } catch (e) {
    error.value = '匹配出错：' + e.message
  }
  return result
})

// 原文高亮 HTML
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const highlightHtml = computed(() => {
  const re = regexObj.value
  if (!re || !testText.value) return ''
  try {
    // 用 matchAll 重新扫描一份，避免消耗原 re 的 lastIndex
    const flags2 = re.flags.includes('g') ? re.flags : re.flags + 'g'
    const re2 = new RegExp(re.source, flags2)
    const ranges = []
    let m
    while ((m = re2.exec(testText.value)) !== null) {
      ranges.push([m.index, m.index + m[0].length])
      if (m.index === re2.lastIndex) re2.lastIndex++
      if (ranges.length > 200) break
    }
    let out = ''
    let cur = 0
    for (const [s, e] of ranges) {
      out += escapeHtml(testText.value.slice(cur, s))
      out += '<mark>' + escapeHtml(testText.value.slice(s, e)) + '</mark>'
      cur = e
    }
    out += escapeHtml(testText.value.slice(cur))
    return out
  } catch {
    return ''
  }
})

// 替换结果
const replacedText = computed(() => {
  const re = regexObj.value
  if (!re || !testText.value || !replacement.value) return null
  try {
    // 确保带 g 才能全部替换；非 g 只替换首个
    return testText.value.replace(re, replacement.value)
  } catch (e) {
    return null
  }
})

async function copyText2(t) {
  if (t == null) return
  const ok = await copyText(String(t))
  ok ? ElMessage.success('已复制') : ElMessage.error('复制失败，请手动复制')
}
</script>

<style scoped>
.regex-tool { display: flex; flex-direction: column; gap: 16px; }
.regex-input-section { display: flex; flex-direction: column; gap: 8px; }
.regex-row { display: flex; align-items: center; gap: 4px; }
.regex-slash { font-size: 24px; color: var(--color-text-secondary, #909399); font-family: monospace; }
.regex-pattern { flex: 1; }
.regex-pattern :deep(input) { font-family: 'Courier New', Consolas, monospace; }
.regex-flags { width: 90px; }
.regex-flags :deep(input) { font-family: 'Courier New', Consolas, monospace; }
.flag-hints { display: flex; gap: 8px; flex-wrap: wrap; }
.flag-tag { cursor: pointer; }

.config-section { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #303133); }

.highlight-box {
  padding: 12px;
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: 6px;
  font-family: 'Courier New', Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 240px;
  overflow: auto;
}
.highlight-box :deep(mark) {
  background: #f56c6c33;
  color: var(--color-text-primary, #303133);
  border-radius: 2px;
  padding: 0 1px;
}

.replace-result {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 8px 10px;
  background: var(--color-bg, #f5f7fa);
  border-radius: 6px;
}
.replace-label { font-size: 12px; color: var(--color-text-secondary, #909399); }
.replace-value {
  font-size: 13px; color: var(--color-text-primary, #303133);
  background: var(--color-surface, #fff);
  padding: 2px 8px; border-radius: 4px;
  word-break: break-all;
}

.error-msg { margin-top: 4px; }
.result-section { display: flex; flex-direction: column; gap: 12px; }
.match-summary { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.match-list { display: flex; flex-direction: column; gap: 6px; }
.match-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; background: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 6px; flex-wrap: wrap;
}
.match-index { font-size: 12px; color: #67c23a; font-weight: 700; }
.match-value { font-size: 13px; color: var(--color-text-primary, #303133); background: var(--color-surface, #fff); padding: 2px 8px; border-radius: 4px; word-break: break-all; }
.match-pos { font-size: 11px; color: var(--color-text-secondary, #909399); }
.match-groups { display: flex; gap: 4px; flex-wrap: wrap; }
.group-tag { font-family: 'Courier New', Consolas, monospace; }

.preset-section { display: flex; flex-direction: column; gap: 8px; }
.section-title { font-size: 15px; font-weight: 600; color: var(--color-text-primary, #303133); margin: 0; }
.preset-list { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
