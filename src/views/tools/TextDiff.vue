<template>
  <ToolLayout
    title="文本对比"
    desc="免费在线文本对比工具，逐行 LCS 比较两段文本差异，支持并排视图、字符级高亮、unified patch 输出，本地处理。"
    fav-key="text-diff"
  >
    <div class="text-diff">
      <div class="input-row">
        <div class="io-panel">
          <label class="config-title">原始文本</label>
          <el-input v-model="text1" type="textarea" :rows="8" placeholder="粘贴原始文本" />
        </div>
        <div class="io-panel">
          <label class="config-title">修改后文本</label>
          <el-input v-model="text2" type="textarea" :rows="8" placeholder="粘贴修改后文本" />
        </div>
      </div>

      <div class="options-bar">
        <el-checkbox v-model="ignoreCase">忽略大小写</el-checkbox>
        <el-checkbox v-model="ignoreTrailing">忽略行尾空白</el-checkbox>
        <el-checkbox v-model="ignoreBlank">忽略空行</el-checkbox>
        <span class="spacer"></span>
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="unified">统一视图</el-radio-button>
          <el-radio-button value="split">并排视图</el-radio-button>
        </el-radio-group>
      </div>

      <div class="action-bar">
        <el-button type="primary" @click="compare" :disabled="!text1 && !text2">对比</el-button>
        <el-button @click="copyPatch" :disabled="!diffResult.length" :icon="CopyDocument">复制为 Patch</el-button>
        <el-button @click="downloadPatch" :disabled="!diffResult.length" :icon="Download">下载 .patch</el-button>
        <el-button @click="clear">清空</el-button>
      </div>

      <!-- 对比结果 -->
      <div v-if="diffResult.length" class="diff-result">
        <div class="diff-summary">
          <el-tag type="success" size="small">新增 {{ stats.added }} 行</el-tag>
          <el-tag type="danger" size="small">删除 {{ stats.removed }} 行</el-tag>
          <el-tag type="info" size="small">相同 {{ stats.same }} 行</el-tag>
        </div>

        <!-- 统一视图 -->
        <div v-if="viewMode === 'unified'" class="diff-list unified">
          <div v-for="(line, i) in diffResult" :key="i" class="diff-line" :class="'diff-' + line.type">
            <span class="line-sign">{{ line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ' }}</span>
            <span class="line-num">{{ lineNum(line) }}</span>
            <span class="line-content">{{ line.text }}</span>
          </div>
        </div>

        <!-- 并排视图 -->
        <div v-else class="diff-split">
          <div class="split-head">
            <span class="col-head">原始</span>
            <span class="col-head">修改后</span>
          </div>
          <div class="split-rows">
            <div v-for="(row, i) in sideRows" :key="i" class="split-row" :class="'row-' + row.type">
              <div class="split-cell cell-left">
                <span class="line-num">{{ row.lIdx || '' }}</span>
                <span class="cell-content" v-html="row.leftHtml"></span>
              </div>
              <div class="split-cell cell-right">
                <span class="line-num">{{ row.rIdx || '' }}</span>
                <span class="cell-content" v-html="row.rightHtml"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { CopyDocument, Download } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { copyText } from '@/utils/format'
import { downloadBlob } from '@/composables/useDownload'

const text1 = ref('')
const text2 = ref('')
const ignoreCase = ref(false)
const ignoreTrailing = ref(false)
const ignoreBlank = ref(false)
const viewMode = ref('unified')
const diffResult = ref([])

const stats = computed(() => ({
  added: diffResult.value.filter((l) => l.type === 'added').length,
  removed: diffResult.value.filter((l) => l.type === 'removed').length,
  same: diffResult.value.filter((l) => l.type === 'same').length
}))

// 选项变化时若有结果则重新对比
watch([ignoreCase, ignoreTrailing, ignoreBlank], () => {
  if (diffResult.value.length) compare()
})

function normLine(l) {
  let s = l
  if (ignoreTrailing.value) s = s.replace(/\s+$/, '')
  if (ignoreCase.value) s = s.toLowerCase()
  return s
}

/** 逐行 LCS 生成 ops：{type:'same'|'removed'|'added', text, lIdx, rIdx} */
function diffLines(a, b) {
  let A = a.split('\n')
  let B = b.split('\n')
  if (ignoreBlank.value) {
    A = A.filter((l) => l.trim() !== '')
    B = B.filter((l) => l.trim() !== '')
  }
  const An = A.map(normLine)
  const Bn = B.map(normLine)
  const m = A.length, n = B.length
  const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = An[i - 1] === Bn[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  let i = m, j = n
  const ops = []
  while (i > 0 && j > 0) {
    if (An[i - 1] === Bn[j - 1]) {
      ops.unshift({ type: 'same', text: A[i - 1], lIdx: i, rIdx: j })
      i--; j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      ops.unshift({ type: 'removed', text: A[i - 1], lIdx: i, rIdx: null })
      i--
    } else {
      ops.unshift({ type: 'added', text: B[j - 1], lIdx: null, rIdx: j })
      j--
    }
  }
  while (i > 0) { ops.unshift({ type: 'removed', text: A[i - 1], lIdx: i, rIdx: null }); i-- }
  while (j > 0) { ops.unshift({ type: 'added', text: B[j - 1], lIdx: null, rIdx: j }); j-- }
  return ops
}

function compare() {
  if (!text1.value && !text2.value) { diffResult.value = []; return }
  const a = text1.value || ''
  const b = text2.value || ''
  diffResult.value = diffLines(a, b)
}

function lineNum(line) {
  return line.lIdx ?? line.rIdx ?? ''
}

/* ---------- 并排视图：把 ops 配对成行，含字符级 diff ---------- */
const sideRows = computed(() => {
  const ops = diffResult.value
  const rows = []
  let i = 0
  while (i < ops.length) {
    const op = ops[i]
    if (op.type === 'same') {
      rows.push(makeRow('equal', op.text, op.text, op.lIdx, op.rIdx, false))
      i++
    } else if (op.type === 'removed') {
      // 收集连续 removed
      const dels = []
      let k = i
      while (k < ops.length && ops[k].type === 'removed') { dels.push(ops[k]); k++ }
      // 若紧随 added，配对为 modify
      if (k < ops.length && ops[k].type === 'added') {
        const adds = []
        let l = k
        while (l < ops.length && ops[l].type === 'added') { adds.push(ops[l]); l++ }
        const pairs = Math.min(dels.length, adds.length)
        for (let p = 0; p < pairs; p++) {
          rows.push(makeRow('modify', dels[p].text, adds[p].text, dels[p].lIdx, adds[p].rIdx, true))
        }
        for (let p = pairs; p < dels.length; p++) {
          rows.push(makeRow('removed', dels[p].text, '', dels[p].lIdx, null, false))
        }
        for (let p = pairs; p < adds.length; p++) {
          rows.push(makeRow('added', '', adds[p].text, null, adds[p].rIdx, false))
        }
        i = l
      } else {
        for (const d of dels) rows.push(makeRow('removed', d.text, '', d.lIdx, null, false))
        i = k
      }
    } else { // added
      rows.push(makeRow('added', '', op.text, null, op.rIdx, false))
      i++
    }
  }
  return rows
})

function makeRow(type, left, right, lIdx, rIdx, charLevel) {
  let leftHtml = '', rightHtml = ''
  if (charLevel && left.length < 2000 && right.length < 2000) {
    const seg = charDiff(left, right)
    leftHtml = renderSeg(seg, 'left')
    rightHtml = renderSeg(seg, 'right')
  } else {
    leftHtml = escapeHtml(left)
    rightHtml = escapeHtml(right)
  }
  return { type, left, right, leftHtml, rightHtml, lIdx, rIdx }
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 字符级 LCS，返回段落 ops: {t:'eq'|'del'|'add', text} */
function charDiff(a, b) {
  const m = a.length, n = b.length
  const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  let i = m, j = n
  const raw = []
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { raw.push({ t: 'eq', text: a[i - 1] }); i--; j-- }
    else if (dp[i - 1][j] >= dp[i][j - 1]) { raw.push({ t: 'del', text: a[i - 1] }); i-- }
    else { raw.push({ t: 'add', text: b[j - 1] }); j-- }
  }
  while (i > 0) { raw.push({ t: 'del', text: a[i - 1] }); i-- }
  while (j > 0) { raw.push({ t: 'add', text: b[j - 1] }); j-- }
  raw.reverse()
  // 合并相邻同类型
  const segs = []
  for (const r of raw) {
    const last = segs[segs.length - 1]
    if (last && last.t === r.t) last.text += r.text
    else segs.push({ t: r.t, text: r.text })
  }
  return segs
}

function renderSeg(segs, side) {
  let out = ''
  for (const s of segs) {
    const e = escapeHtml(s.text)
    if (s.t === 'eq') out += e
    else if (s.t === 'del' && side === 'left') out += `<span class="cd">${e}</span>`
    else if (s.t === 'add' && side === 'right') out += `<span class="ca">${e}</span>`
  }
  return out
}

/* ---------- unified patch 文本 ---------- */
function buildUnifiedPatch() {
  const ops = diffResult.value
  if (!ops.length) return ''
  const context = 3
  const n = ops.length
  const changeIdx = []
  for (let i = 0; i < n; i++) if (ops[i].type !== 'same') changeIdx.push(i)
  if (!changeIdx.length) return ''
  const hunks = []
  let gs = Math.max(0, changeIdx[0] - context)
  let ge = Math.min(n - 1, changeIdx[0] + context)
  for (let i = 1; i < changeIdx.length; i++) {
    const cs = Math.max(0, changeIdx[i] - context)
    if (cs <= ge + 1) {
      ge = Math.min(n - 1, changeIdx[i] + context)
    } else {
      hunks.push([gs, ge])
      gs = cs
      ge = Math.min(n - 1, changeIdx[i] + context)
    }
  }
  hunks.push([gs, ge])

  const lines = ['--- original', '+++ modified']
  let lastLeft = 0
  let lastRight = 0
  for (const [s, e] of hunks) {
    let aStart = -1, bStart = -1, aCount = 0, bCount = 0
    for (let i = s; i <= e; i++) {
      const op = ops[i]
      if (op.type !== 'added') { if (aStart === -1) aStart = op.lIdx; aCount++ }
      if (op.type !== 'removed') { if (bStart === -1) bStart = op.rIdx; bCount++ }
    }
    if (aStart === -1) aStart = (s > 0 ? ops[s - 1].lIdx : 0) || 0
    if (bStart === -1) bStart = (s > 0 ? ops[s - 1].rIdx : 0) || 0
    const aPart = aCount === 0 ? `${aStart},0` : `${aStart},${aCount}`
    const bPart = bCount === 0 ? `${bStart},0` : `${bStart},${bCount}`
    lines.push(`@@ -${aPart} +${bPart} @@`)
    for (let i = s; i <= e; i++) {
      const op = ops[i]
      const prefix = op.type === 'same' ? ' ' : op.type === 'removed' ? '-' : '+'
      lines.push(prefix + op.text)
    }
  }
  return lines.join('\n') + '\n'
}

async function copyPatch() {
  const patch = buildUnifiedPatch()
  if (!patch) return
  const ok = await copyText(patch)
  ok ? ElMessage.success('Patch 已复制') : ElMessage.error('复制失败，请手动复制')
}

function downloadPatch() {
  const patch = buildUnifiedPatch()
  if (!patch) return
  downloadBlob(new Blob([patch], { type: 'text/plain;charset=utf-8' }), 'diff.patch')
}

function clear() {
  text1.value = ''
  text2.value = ''
  diffResult.value = []
}
</script>

<style scoped>
.text-diff { display: flex; flex-direction: column; gap: 16px; }
.input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.io-panel { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #303133); }

.options-bar { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.spacer { flex: 1; }

.action-bar { display: flex; gap: 8px; flex-wrap: wrap; }

.diff-result { display: flex; flex-direction: column; gap: 12px; }
.diff-summary { display: flex; gap: 8px; flex-wrap: wrap; }

/* 统一视图 */
.diff-list {
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: var(--radius, 8px);
  overflow: hidden;
  font-family: 'Courier New', Consolas, monospace;
  font-size: 13px;
  max-height: 520px;
  overflow-y: auto;
}
.diff-line { display: flex; padding: 1px 8px; align-items: flex-start; }
.line-sign { width: 18px; flex-shrink: 0; color: var(--color-text-secondary, #909399); }
.line-num { width: 46px; flex-shrink: 0; color: var(--color-text-placeholder, #c0c4cc); text-align: right; padding-right: 8px; }
.line-content { white-space: pre-wrap; word-break: break-all; flex: 1; }
.diff-same { background: var(--color-surface, #fff); }
.diff-added { background: #f0f9eb; }
.diff-removed { background: #fef0f0; }
.diff-added .line-sign { color: #67c23a; }
.diff-removed .line-sign { color: #f56c6c; }

/* 并排视图 */
.diff-split {
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: var(--radius, 8px);
  overflow: hidden;
  font-family: 'Courier New', Consolas, monospace;
  font-size: 13px;
}
.split-head, .split-row { display: grid; grid-template-columns: 1fr 1fr; }
.split-head {
  background: var(--color-bg, #f5f7fa);
  border-bottom: 1px solid var(--color-border, #ebeef5);
  font-weight: 600; color: var(--color-text-secondary, #909399);
  font-size: 12px;
}
.col-head { padding: 6px 10px; }
.split-rows { max-height: 520px; overflow: auto; }
.split-row { border-bottom: 1px solid var(--color-border, #ebeef5); }
.split-row:last-child { border-bottom: none; }
.split-cell { display: flex; align-items: flex-start; padding: 1px 8px; min-height: 22px; }
.cell-left { border-right: 1px solid var(--color-border, #ebeef5); }
.cell-content { white-space: pre-wrap; word-break: break-all; flex: 1; }
.row-equal { background: var(--color-surface, #fff); }
.row-added { background: #f0f9eb; }
.row-removed { background: #fef0f0; }
.row-modify .cell-left { background: #fef0f0; }
.row-modify .cell-right { background: #f0f9eb; }
.cell-content :deep(.cd) { background: #f56c6c55; border-radius: 2px; color: var(--color-text-primary, #303133); }
.cell-content :deep(.ca) { background: #67c23a55; border-radius: 2px; color: var(--color-text-primary, #303133); }
.line-num { width: 44px; flex-shrink: 0; color: var(--color-text-placeholder, #c0c4cc); text-align: right; padding-right: 8px; }

@media (max-width: 768px) {
  .input-row { grid-template-columns: 1fr; }
  .diff-split .split-head, .diff-split .split-row { grid-template-columns: 1fr; }
  .cell-left { border-right: none; border-bottom: 1px dashed var(--color-border, #ebeef5); }
}
</style>
