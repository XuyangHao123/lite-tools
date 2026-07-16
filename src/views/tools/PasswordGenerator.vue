<template>
  <ToolLayout title="密码生成器" desc="免费在线生成随机密码，支持自定义长度、字符类型，安全可靠，本地生成不上传。">
    <div class="pwd-generator">
      <!-- 结果展示 -->
      <div class="pwd-result">
        <el-input
          v-model="password"
          size="large"
          readonly
          placeholder="点击下方生成按钮"
          class="pwd-input"
        >
          <template #append>
            <el-button :icon="CopyDocument" @click="copyPassword" :disabled="!password">
              复制
            </el-button>
          </template>
        </el-input>
        <div class="pwd-strength">
          <span class="strength-label">强度：</span>
          <el-rate
            v-model="strengthLevel"
            disabled
            :max="4"
            :texts="['弱', '一般', '较强', '很强']"
            show-text
          />
        </div>
      </div>

      <!-- 配置 -->
      <el-form label-position="top" class="pwd-config">
        <el-form-item label="密码长度">
          <el-slider
            v-model="length"
            :min="4"
            :max="64"
            show-input
            :show-input-controls="false"
          />
        </el-form-item>

        <div class="pwd-options">
          <el-form-item>
            <el-checkbox v-model="useUpper">大写字母 (A-Z)</el-checkbox>
          </el-form-item>
          <el-form-item>
            <el-checkbox v-model="useLower">小写字母 (a-z)</el-checkbox>
          </el-form-item>
          <el-form-item>
            <el-checkbox v-model="useNumbers">数字 (0-9)</el-checkbox>
          </el-form-item>
          <el-form-item>
            <el-checkbox v-model="useSymbols">特殊符号 (!@#$%...)</el-checkbox>
          </el-form-item>
        </div>

        <el-form-item>
          <el-button type="primary" size="large" @click="generate" class="generate-btn">
            生成密码
          </el-button>
          <el-button size="large" @click="generate" :disabled="!password">再生成一个</el-button>
        </el-form-item>
      </el-form>
    </div>
  </ToolLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import ToolLayout from '@/components/ToolLayout.vue'

const length = ref(16)
const useUpper = ref(true)
const useLower = ref(true)
const useNumbers = ref(true)
const useSymbols = ref(false)
const password = ref('')

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const NUMBERS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

/** 生成密码 */
function generate() {
  let charset = ''
  if (useUpper.value) charset += UPPER
  if (useLower.value) charset += LOWER
  if (useNumbers.value) charset += NUMBERS
  if (useSymbols.value) charset += SYMBOLS

  if (!charset) {
    ElMessage.warning('请至少选择一种字符类型')
    return
  }

  // 使用 crypto.getRandomValues 生成密码学安全的随机数
  const array = new Uint32Array(length.value)
  crypto.getRandomValues(array)

  let result = ''
  for (let i = 0; i < length.value; i++) {
    result += charset[array[i] % charset.length]
  }
  password.value = result
}

/** 密码强度评估（1-4级） */
const strengthLevel = computed(() => {
  if (!password.value) return 0
  let score = 0
  if (password.value.length >= 8) score++
  if (password.value.length >= 16) score++
  const types = [useUpper.value, useLower.value, useNumbers.value, useSymbols.value]
    .filter(Boolean).length
  if (types >= 3) score++
  return Math.min(score, 4)
})

/** 复制密码 */
async function copyPassword() {
  if (!password.value) return
  try {
    await navigator.clipboard.writeText(password.value)
    ElMessage.success('密码已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

// 初始生成一个
generate()
</script>

<style scoped>
.pwd-generator {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.pwd-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pwd-input :deep(.el-input__inner) {
  font-family: 'Courier New', monospace;
  font-size: 18px;
  letter-spacing: 1px;
}

.pwd-strength {
  display: flex;
  align-items: center;
  gap: 8px;
}

.strength-label {
  font-size: 14px;
  color: #606266;
}

.pwd-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
}

.generate-btn {
  min-width: 140px;
}

@media (max-width: 768px) {
  .pwd-options {
    grid-template-columns: 1fr;
  }
}
</style>
