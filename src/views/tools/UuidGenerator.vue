<template>
  <ToolLayout
    title="UUID 生成器"
    desc="免费在线生成 UUID/GUID，支持 v1（时间戳）/v3（MD5+命名空间）/v4（随机）/v5（SHA1+命名空间）/Nil，批量去重，多种格式（连字符/大写/花括号/URN），可导出 txt/json/csv，使用加密安全随机数，本地生成不上传。"
    fav-key="uuid-generator"
  >
    <div class="uuid-tool">
      <div class="config-section">
        <label class="config-title">UUID 版本</label>
        <el-radio-group v-model="version">
          <el-radio-button value="4">v4（随机）</el-radio-button>
          <el-radio-button value="1">v1（时间戳）</el-radio-button>
          <el-radio-button value="5">v5（SHA1+命名空间）</el-radio-button>
          <el-radio-button value="3">v3（MD5+命名空间）</el-radio-button>
          <el-radio-button value="nil">Nil（全零）</el-radio-button>
        </el-radio-group>
      </div>

      <!-- v3 / v5：命名空间 + 名称 -->
      <template v-if="version === '3' || version === '5'">
        <div class="config-section">
          <label class="config-title">命名空间预设</label>
          <el-select v-model="nsPreset" style="width: 100%" @change="onNsPresetChange">
            <el-option label="DNS（6ba2b610-9dad-11d1-80b4-00c04fd430c8）" value="dns" />
            <el-option label="URL（6ba2b611-9dad-11d1-80b4-00c04fd430c8）" value="url" />
            <el-option label="OID（6ba2b612-9dad-11d1-80b4-00c04fd430c8）" value="oid" />
            <el-option label="FQDN（6ba2b613-9dad-11d1-80b4-00c04fd430c8）" value="fqdn" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </div>
        <div class="config-section">
          <label class="config-title">命名空间 UUID</label>
          <el-input v-model="namespace" placeholder="如 6ba2b611-9dad-11d1-80b4-00c04fd430c8" :class="{ 'is-error': nsError }" @input="validateNs" />
          <span v-if="nsError" class="error-tip">{{ nsError }}</span>
        </div>
        <div class="config-section">
          <label class="config-title">名称（name）</label>
          <el-input v-model="nameInput" placeholder="如 https://example.com 或任意字符串" />
        </div>
      </template>

      <div class="config-section">
        <label class="config-title">生成数量</label>
        <el-input-number v-model="count" :min="1" :max="1000" size="large" />
      </div>

      <div class="config-section">
        <label class="config-title">格式</label>
        <el-radio-group v-model="format">
          <el-radio-button value="standard">标准（连字符）</el-radio-button>
          <el-radio-button value="nodash">无连字符</el-radio-button>
          <el-radio-button value="uppercase">大写</el-radio-button>
          <el-radio-button value="braces">花括号</el-radio-button>
          <el-radio-button value="urn">URN</el-radio-button>
        </el-radio-group>
      </div>

      <div class="config-section">
        <el-checkbox v-model="dedup">去重过滤（批量生成时自动过滤重复）</el-checkbox>
      </div>

      <div class="action-bar">
        <el-button type="primary" size="large" :loading="generating" @click="generate">生成</el-button>
        <el-button size="large" :icon="CopyDocument" :disabled="!results.length" @click="copyAll">全部复制</el-button>
        <el-button size="large" :disabled="!results.length" @click="results = []">清空</el-button>
        <el-select v-model="exportFmt" size="large" style="width: 110px" placeholder="导出文件">
          <el-option label="导出 TXT" value="txt" />
          <el-option label="导出 JSON" value="json" />
          <el-option label="导出 CSV" value="csv" />
        </el-select>
        <el-button size="large" :icon="Download" :disabled="!results.length" @click="exportFile">导出</el-button>
      </div>

      <div v-if="results.length" class="result-meta">
        <span>共 {{ results.length }} 条</span>
        <span v-if="dedupInfo">（已去重 {{ dedupInfo }} 条重复）</span>
      </div>

      <div v-if="results.length" class="result-list">
        <div v-for="(id, i) in results" :key="i" class="result-item">
          <span class="result-num">{{ i + 1 }}</span>
          <code class="uuid-code">{{ id }}</code>
          <el-button size="small" :icon="CopyDocument" @click="copyOne(id)">复制</el-button>
        </div>
      </div>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CopyDocument, Download } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'
import { copyText } from '@/utils/format'
import { downloadBlob } from '@/composables/useDownload'

const count = ref(1)
const format = ref('standard')
const version = ref('4')
const dedup = ref(false)
const generating = ref(false)
const results = ref([])
const dedupInfo = ref(0)
const exportFmt = ref('txt')

// v3 / v5 命名空间相关
const nsPreset = ref('url')
const namespace = ref('6ba2b611-9dad-11d1-80b4-00c04fd430c8')
const nameInput = ref('')
const nsError = ref('')

const NS_PRESETS = {
  dns: '6ba2b610-9dad-11d1-80b4-00c04fd430c8',
  url: '6ba2b611-9dad-11d1-80b4-00c04fd430c8',
  oid: '6ba2b612-9dad-11d1-80b4-00c04fd430c8',
  fqdn: '6ba2b613-9dad-11d1-80b4-00c04fd430c8'
}

function onNsPresetChange(val) {
  if (val !== 'custom' && NS_PRESETS[val]) {
    namespace.value = NS_PRESETS[val]
    nsError.value = ''
  }
}

function validateNs() {
  if (version.value !== '3' && version.value !== '5') {
    nsError.value = ''
    return true
  }
  const hex = namespace.value.replace(/[-{}]/g, '').replace(/^urn:uuid:/i, '')
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    nsError.value = '请输入合法的 UUID（32 位十六进制）'
    return false
  }
  nsError.value = ''
  return true
}

/** 16 字节 → 标准 UUID 字符串 */
function bytesToUuid(bytes) {
  const h = []
  for (let i = 0; i < 16; i++) h.push(bytes[i].toString(16).padStart(2, '0'))
  return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`
}

/** UUID 字符串 → 16 字节 */
function uuidToBytes(str) {
  const hex = String(str).replace(/[-{}]/g, '').replace(/^urn:uuid:/i, '')
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  return bytes
}

/** UUID v4：加密安全随机 */
function uuidV4() {
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  return bytesToUuid(b)
}

/** UUID v1：时间戳 + 随机节点（用 BigInt 处理 60 位时间戳） */
function uuidV1() {
  // 1582-10-15 到 1970-01-01，以 100 纳秒为单位的偏移
  const offset100ns = 122192928000000000n
  const uuidTime = BigInt(Date.now()) * 10000n + offset100ns
  const timeLow = uuidTime & 0xffffffffn
  const timeMid = (uuidTime >> 32n) & 0xffffn
  const timeHi = (uuidTime >> 48n) & 0x0fffn

  const b = crypto.getRandomValues(new Uint8Array(16))
  // time_low（大端，符合 UUID 字符串表示）
  b[0] = Number((timeLow >> 24n) & 0xffn)
  b[1] = Number((timeLow >> 16n) & 0xffn)
  b[2] = Number((timeLow >> 8n) & 0xffn)
  b[3] = Number(timeLow & 0xffn)
  // time_mid（大端）
  b[4] = Number((timeMid >> 8n) & 0xffn)
  b[5] = Number(timeMid & 0xffn)
  // time_hi_and_version（大端），高 4 位为版本号 1
  const timeHiVer = 0x1000n | (timeHi & 0x0fffn)
  b[6] = Number((timeHiVer >> 8n) & 0xffn)
  b[7] = Number(timeHiVer & 0xffn)
  // clock_seq：b[8]、b[9] 已随机，设置变体（10xx）
  b[8] = (b[8] & 0x3f) | 0x80
  // node：b[10..15] 已随机，设置 multicast 位（随机节点标识）
  b[10] |= 0x01
  return bytesToUuid(b)
}

// ===== MD5（Web Crypto 不支持 MD5，内置实现 RFC 1321） =====
function md5(data) {
  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21]
  const K = [0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
    0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
    0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
    0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
    0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
    0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391]

  const origLen = data.length
  const bitLen = origLen * 8
  const blocks = Math.ceil((origLen + 9) / 64)
  const msg = new Uint32Array(blocks * 16)
  for (let i = 0; i < origLen; i++) {
    msg[i >>> 2] |= data[i] << ((i % 4) * 8)
  }
  msg[origLen >>> 2] |= 0x80 << ((origLen % 4) * 8)
  msg[blocks * 16 - 2] = bitLen >>> 0
  msg[blocks * 16 - 1] = Math.floor(bitLen / 0x100000000) >>> 0

  const rotL = (x, c) => (x << c) | (x >>> (32 - c))
  const add = (x, y) => (((x & 0xffffffff) + (y & 0xffffffff)) & 0xffffffff)

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476
  for (let i = 0; i < blocks * 16; i += 16) {
    const M = msg.subarray(i, i + 16)
    let A = a0, B = b0, C = c0, D = d0
    for (let j = 0; j < 64; j++) {
      let F, g
      if (j < 16) { F = (B & C) | (~B & D); g = j }
      else if (j < 32) { F = (D & B) | (~D & C); g = (5 * j + 1) % 16 }
      else if (j < 48) { F = B ^ C ^ D; g = (3 * j + 5) % 16 }
      else { F = C ^ (B | ~D); g = (7 * j) % 16 }
      F = add(add(add(F, A), K[j]), M[g])
      A = D; D = C; C = B; B = add(B, rotL(F, S[j]))
    }
    a0 = add(a0, A); b0 = add(b0, B); c0 = add(c0, C); d0 = add(d0, D)
  }
  const out = new Uint8Array(16)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, a0, true)
  dv.setUint32(4, b0, true)
  dv.setUint32(8, c0, true)
  dv.setUint32(12, d0, true)
  return out
}

/** UUID v3：MD5(namespace + name) */
async function uuidV3(namespaceStr, name) {
  const nsBytes = uuidToBytes(namespaceStr)
  const nameBytes = new TextEncoder().encode(name)
  const data = new Uint8Array(nsBytes.length + nameBytes.length)
  data.set(nsBytes, 0)
  data.set(nameBytes, nsBytes.length)
  const b = md5(data).slice(0, 16)
  b[6] = (b[6] & 0x0f) | 0x30
  b[8] = (b[8] & 0x3f) | 0x80
  return bytesToUuid(b)
}

/** UUID v5：SHA-1(namespace + name)，使用 Web Crypto */
async function uuidV5(namespaceStr, name) {
  const nsBytes = uuidToBytes(namespaceStr)
  const nameBytes = new TextEncoder().encode(name)
  const data = new Uint8Array(nsBytes.length + nameBytes.length)
  data.set(nsBytes, 0)
  data.set(nameBytes, nsBytes.length)
  const hashBuf = await crypto.subtle.digest('SHA-1', data)
  const b = new Uint8Array(hashBuf).slice(0, 16)
  b[6] = (b[6] & 0x0f) | 0x50
  b[8] = (b[8] & 0x3f) | 0x80
  return bytesToUuid(b)
}

/** 按格式调整输出 */
function applyFormat(id) {
  switch (format.value) {
    case 'nodash': return id.replace(/-/g, '')
    case 'uppercase': return id.toUpperCase()
    case 'braces': return `{${id}}`
    case 'urn': return `urn:uuid:${id}`
    default: return id
  }
}

async function generate() {
  // v3 / v5 校验
  if ((version.value === '3' || version.value === '5') && !validateNs()) {
    ElMessage.error('请填写合法的命名空间 UUID')
    return
  }
  if ((version.value === '3' || version.value === '5') && !nameInput.value) {
    ElMessage.warning('请填写名称（name）')
    return
  }
  generating.value = true
  try {
    const raw = []
    for (let i = 0; i < count.value; i++) {
      let id
      switch (version.value) {
        case 'nil': id = '00000000-0000-0000-0000-000000000000'; break
        case 'v1':
        case '1': id = uuidV1(); break
        case '3': id = await uuidV3(namespace.value, nameInput.value); break
        case '5': id = await uuidV5(namespace.value, nameInput.value); break
        case '4':
        default: id = uuidV4()
      }
      raw.push(id)
    }
    // 去重
    let dupCount = 0
    let final = raw
    if (dedup.value) {
      const seen = new Set()
      final = []
      for (const id of raw) {
        if (seen.has(id)) { dupCount++; continue }
        seen.add(id)
        final.push(id)
      }
    }
    dedupInfo.value = dupCount
    results.value = final.map(applyFormat)
  } catch (e) {
    ElMessage.error('生成失败：' + (e?.message || '未知错误'))
  } finally {
    generating.value = false
  }
}

async function copyOne(id) {
  const ok = await copyText(id)
  ok ? ElMessage.success('已复制') : ElMessage.error('复制失败')
}

async function copyAll() {
  if (!results.value.length) return
  const ok = await copyText(results.value.join('\n'))
  ok ? ElMessage.success('已复制全部') : ElMessage.error('复制失败')
}

/** 导出文件 */
function exportFile() {
  if (!results.value.length) return
  try {
    const ts = Date.now()
    if (exportFmt.value === 'json') {
      const text = JSON.stringify(results.value, null, 2)
      downloadBlob(new Blob([text], { type: 'application/json' }), `uuids-${ts}.json`)
    } else if (exportFmt.value === 'csv') {
      const rows = ['index,uuid', ...results.value.map((id, i) => `${i + 1},${id}`)]
      // 加 BOM 兼容 Excel
      const text = '\ufeff' + rows.join('\n')
      downloadBlob(new Blob([text], { type: 'text/csv' }), `uuids-${ts}.csv`)
    } else {
      const text = results.value.join('\n')
      downloadBlob(new Blob([text], { type: 'text/plain' }), `uuids-${ts}.txt`)
    }
    ElMessage.success('已导出')
  } catch (e) {
    ElMessage.error('导出失败：' + (e?.message || '未知错误'))
  }
}

// 初始生成
generate()
</script>

<style scoped>
.uuid-tool {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.config-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.config-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary, #303133);
}
.error-tip {
  font-size: 12px;
  color: #f56c6c;
}
:deep(.is-error .el-input__wrapper) {
  box-shadow: 0 0 0 1px #f56c6c inset;
}
.action-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.result-meta {
  font-size: 13px;
  color: var(--color-text-secondary, #909399);
}
.result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 480px;
  overflow-y: auto;
}
.result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--color-bg, #f5f7fa);
  border-radius: var(--radius, 6px);
}
.result-num {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-light, #ecf5ff);
  color: var(--color-primary, #409eff);
  border-radius: 50%;
  font-size: 12px;
  flex-shrink: 0;
}
.uuid-code {
  flex: 1;
  font-family: ui-monospace, 'Courier New', monospace;
  font-size: 14px;
  color: var(--color-text-primary, #303133);
  word-break: break-all;
}
@media (max-width: 768px) {
  .action-bar .el-select {
    width: 100% !important;
  }
}
</style>
