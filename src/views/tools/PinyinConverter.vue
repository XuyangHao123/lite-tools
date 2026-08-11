<template>
  <ToolLayout
    title="汉字转拼音"
    desc="免费在线汉字转拼音工具，支持声调符号/数字、无声调、首字母、多音字候选、姓氏模式与逐字对照，本地处理不上传。"
    fav-key="pinyin-converter"
  >
    <div class="pinyin-tool">
      <div class="config-section">
        <label class="config-title">输入汉字</label>
        <el-input v-model="text" type="textarea" :rows="6" placeholder="输入要转换的汉字（可含中英文标点数字）" />
      </div>

      <div class="config-section">
        <label class="config-title">输出格式</label>
        <el-radio-group v-model="mode">
          <el-radio-button value="symbol">声调符号</el-radio-button>
          <el-radio-button value="num">声调数字</el-radio-button>
          <el-radio-button value="none">无声调</el-radio-button>
          <el-radio-button value="initial">首字母</el-radio-button>
        </el-radio-group>
      </div>

      <div class="config-section options-row">
        <el-checkbox v-model="upperCase">大写</el-checkbox>
        <el-checkbox v-model="addSpace" :disabled="mode === 'initial'">字间加空格</el-checkbox>
        <el-checkbox v-model="surnameMode">姓氏模式（姓氏汉字优先匹配姓氏读音）</el-checkbox>
      </div>

      <div class="action-bar">
        <el-button type="primary" :icon="CopyDocument" @click="copyResult" :disabled="!result">复制结果</el-button>
        <el-button @click="text = ''" :disabled="!text">清空</el-button>
      </div>

      <!-- 结果 -->
      <div v-if="result" class="result-section">
        <label class="config-title">拼音结果</label>
        <div class="result-box">{{ result }}</div>
      </div>

      <!-- 逐字对照表 -->
      <div v-if="charTable.length" class="result-section">
        <div class="table-header">
          <label class="config-title">逐字对照表</label>
          <span class="poly-tip">标 <el-tag size="small" type="warning">多</el-tag> 者为多音字</span>
        </div>
        <div class="char-table">
          <div class="char-row char-head">
            <span class="cell cell-zh">汉字</span>
            <span class="cell cell-py">拼音</span>
            <span class="cell cell-cand">多音字候选</span>
          </div>
          <div v-for="(row, i) in charTable" :key="i" class="char-row" :class="{ nonzh: !row.isZh }">
            <span class="cell cell-zh">{{ row.char }}</span>
            <span class="cell cell-py">{{ row.pinyin || '—' }}</span>
            <span class="cell cell-cand">
              <template v-if="row.candidates.length > 1">
                <el-tag size="small" type="warning" class="poly-badge">多</el-tag>
                <el-tag v-for="(c, ci) in row.candidates" :key="ci" size="small" :type="c === row.pinyin ? 'success' : 'info'" class="cand-tag">{{ c }}</el-tag>
              </template>
              <span v-else class="no-cand">{{ row.candidates.length ? row.candidates[0] : '—' }}</span>
            </span>
          </div>
        </div>
      </div>

      <p class="tool-tip">
        提示：拼音转汉字（反向）需大规模词库，暂不支持。姓氏模式对姓氏表中的汉字优先采用姓氏读音。多音字由 pinyin-pro 依据上下文推断，并列出全部候选读音供参考。
      </p>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CopyDocument } from '@element-plus/icons-vue'
import { pinyin } from 'pinyin-pro'
import ToolLayout from '@/components/ToolLayout.vue'
import { copyText } from '@/utils/format'

const text = ref('')
const mode = ref('symbol')
const upperCase = ref(false)
const addSpace = ref(true)
const surnameMode = ref(false)

// 构造 pinyin-pro 选项（不含 type，用于字符串结果）
function buildOpts() {
  const opts = {}
  if (mode.value === 'symbol') opts.toneType = 'symbol'
  else if (mode.value === 'num') opts.toneType = 'num'
  else if (mode.value === 'none') opts.toneType = 'none'
  else if (mode.value === 'initial') opts.pattern = 'first'
  if (surnameMode.value) opts.mode = 'surname'
  return opts
}

const result = computed(() => {
  if (!text.value) return ''
  let r = pinyin(text.value, buildOpts())
  if (mode.value === 'initial') {
    r = r.replace(/\s/g, '')
  } else if (!addSpace.value) {
    r = r.replace(/\s/g, '')
  }
  if (upperCase.value) r = r.toUpperCase()
  return r
})

// 逐字对照：用 type:'all' 取每字信息与多音字候选
const charTable = computed(() => {
  if (!text.value) return []
  try {
    const opts = { ...buildOpts(), type: 'all' }
    const all = pinyin(text.value, opts)
    if (!Array.isArray(all)) return []
    return all.map((item) => ({
      char: item.origin,
      pinyin: item.pinyin,
      isZh: item.isZh,
      candidates: Array.isArray(item.polyphonic) ? item.polyphonic.filter(Boolean) : []
    }))
  } catch {
    return []
  }
})

async function copyResult() {
  if (!result.value) return
  const ok = await copyText(result.value)
  ok ? ElMessage.success('已复制') : ElMessage.error('复制失败，请手动复制')
}
</script>

<style scoped>
.pinyin-tool { display: flex; flex-direction: column; gap: 20px; }
.config-section { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary, #303133); }
.options-row { flex-direction: row; flex-wrap: wrap; gap: 16px; }
.action-bar { display: flex; gap: 12px; flex-wrap: wrap; }
.result-section { display: flex; flex-direction: column; gap: 8px; }
.result-box {
  padding: 16px;
  background: var(--color-bg, #f5f7fa);
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: var(--radius, 8px);
  font-size: 18px; line-height: 1.8;
  color: var(--color-text-primary, #303133);
  word-break: break-all;
}

.table-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.poly-tip { font-size: 12px; color: var(--color-text-secondary, #909399); }
.char-table {
  border: 1px solid var(--color-border, #ebeef5);
  border-radius: var(--radius, 8px);
  overflow: hidden;
  max-height: 360px;
  overflow-y: auto;
}
.char-row {
  display: grid;
  grid-template-columns: 60px 1fr 2fr;
  align-items: center;
  border-bottom: 1px solid var(--color-border, #ebeef5);
  font-size: 13px;
}
.char-row:last-child { border-bottom: none; }
.char-head {
  background: var(--color-bg, #f5f7fa);
  font-weight: 600;
  color: var(--color-text-secondary, #909399);
  font-size: 12px;
}
.cell { padding: 8px 10px; word-break: break-all; }
.cell-zh {
  font-size: 18px; font-weight: 700;
  color: var(--color-primary, #409eff);
  text-align: center;
}
.char-head .cell-zh { font-size: 12px; color: inherit; font-weight: 600; }
.cell-py { font-family: 'Courier New', Consolas, monospace; color: var(--color-text-regular, #606266); }
.char-row.nonzh .cell-zh { color: var(--color-text-secondary, #909399); }
.cand-tag { margin-right: 4px; margin-bottom: 2px; font-family: 'Courier New', Consolas, monospace; }
.poly-badge { margin-right: 6px; }
.no-cand { color: var(--color-text-placeholder, #c0c4cc); }

.tool-tip {
  font-size: 12px;
  color: var(--color-text-secondary, #909399);
  margin: 0; line-height: 1.7;
}

@media (max-width: 768px) {
  .char-row { grid-template-columns: 50px 1fr 1.5fr; }
}
</style>
