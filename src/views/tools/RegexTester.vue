<template>
  <ToolLayout title="正则表达式测试" desc="免费在线正则表达式测试工具，支持实时匹配、高亮、分组捕获，本地处理。">
    <div class="regex-tool">
      <!-- 正则输入 -->
      <div class="regex-input-section">
        <div class="regex-row">
          <span class="regex-slash">/</span>
          <el-input v-model="pattern" placeholder="输入正则表达式" size="large" class="regex-pattern" />
          <span class="regex-slash">/</span>
          <el-input v-model="flags" placeholder="gim" size="large" class="regex-flags" />
        </div>
        <div class="flag-hints">
          <el-tag size="small" @click="toggleFlag('g')" :type="flags.includes('g') ? 'primary' : 'info'" class="flag-tag">g 全局</el-tag>
          <el-tag size="small" @click="toggleFlag('i')" :type="flags.includes('i') ? 'primary' : 'info'" class="flag-tag">i 忽略大小写</el-tag>
          <el-tag size="small" @click="toggleFlag('m')" :type="flags.includes('m') ? 'primary' : 'info'" class="flag-tag">m 多行</el-tag>
        </div>
      </div>

      <!-- 测试文本 -->
      <div class="config-section">
        <label class="config-title">测试文本</label>
        <el-input v-model="testText" type="textarea" :rows="6" placeholder="输入要匹配的文本" />
      </div>

      <!-- 结果 -->
      <div v-if="error" class="error-msg"><el-alert :title="error" type="error" show-icon :closable="false" /></div>

      <div v-if="matches.length && !error" class="result-section">
        <div class="match-summary">
          <el-tag type="success" size="large">匹配到 {{ matches.length }} 个结果</el-tag>
        </div>
        <div class="match-list">
          <div v-for="(m, i) in matches" :key="i" class="match-item">
            <span class="match-index">#{{ i + 1 }}</span>
            <code class="match-value">{{ m.value }}</code>
            <span class="match-pos">位置 {{ m.index }}</span>
            <div v-if="m.groups && m.groups.length" class="match-groups">
              <el-tag v-for="(g, gi) in m.groups" :key="gi" size="small" type="info" class="group-tag">
                {{ g !== undefined ? g : '(空)' }}
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
import ToolLayout from '@/components/ToolLayout.vue'

const pattern = ref('')
const flags = ref('g')
const testText = ref('')
const error = ref('')

const presets = [
  { name: '邮箱', pattern: '[\\w.-]+@[\\w.-]+\\.\\w+', flags: 'g' },
  { name: '手机号', pattern: '1[3-9]\\d{9}', flags: 'g' },
  { name: 'URL', pattern: 'https?://[\\w./?=&%-]+', flags: 'g' },
  { name: 'IP地址', pattern: '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}', flags: 'g' },
  { name: '身份证', pattern: '\\d{17}[\\dXx]', flags: 'g' },
  { name: '日期', pattern: '\\d{4}-\\d{2}-\\d{2}', flags: 'g' }
]

function toggleFlag(flag) {
  if (flags.value.includes(flag)) {
    flags.value = flags.value.replace(flag, '')
  } else {
    flags.value += flag
  }
}

function usePreset(p) {
  pattern.value = p.pattern
  flags.value = p.flags
}

const matches = computed(() => {
  if (!pattern.value || !testText.value) { error.value = ''; return [] }
  try {
    error.value = ''
    const regex = new RegExp(pattern.value, flags.value)
    const result = []

    if (flags.value.includes('g')) {
      let m
      let count = 0
      while ((m = regex.exec(testText.value)) !== null) {
        result.push({
          value: m[0],
          index: m.index,
          groups: m.slice(1)
        })
        count++
        if (count > 100) break // 防止无限循环
        if (m.index === regex.lastIndex) regex.lastIndex++
      }
    } else {
      const m = regex.exec(testText.value)
      if (m) {
        result.push({ value: m[0], index: m.index, groups: m.slice(1) })
      }
    }
    return result
  } catch (e) {
    error.value = '正则表达式错误：' + e.message
    return []
  }
})
</script>

<style scoped>
.regex-tool { display: flex; flex-direction: column; gap: 16px; }
.regex-input-section { display: flex; flex-direction: column; gap: 8px; }
.regex-row { display: flex; align-items: center; gap: 4px; }
.regex-slash { font-size: 24px; color: #909399; font-family: monospace; }
.regex-pattern { flex: 1; }
.regex-pattern :deep(input) { font-family: monospace; }
.regex-flags { width: 80px; }
.regex-flags :deep(input) { font-family: monospace; }
.flag-hints { display: flex; gap: 8px; }
.flag-tag { cursor: pointer; }
.config-section { display: flex; flex-direction: column; gap: 8px; }
.config-title { font-size: 14px; font-weight: 600; color: #303133; }
.error-msg { margin-top: 4px; }
.result-section { display: flex; flex-direction: column; gap: 12px; }
.match-list { display: flex; flex-direction: column; gap: 6px; }
.match-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f0f9eb; border-radius: 6px; flex-wrap: wrap; }
.match-index { font-size: 12px; color: #67c23a; font-weight: 600; }
.match-value { font-size: 13px; color: #303133; background: #fff; padding: 2px 8px; border-radius: 4px; }
.match-pos { font-size: 11px; color: #909399; }
.match-groups { display: flex; gap: 4px; }
.group-tag { font-family: monospace; }
.preset-section { display: flex; flex-direction: column; gap: 8px; }
.section-title { font-size: 15px; font-weight: 600; color: #303133; margin: 0; }
.preset-list { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
