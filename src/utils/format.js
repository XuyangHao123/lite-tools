/**
 * 通用格式化工具函数（供各工具复用，消除重复实现）
 */

/** 字节数 → 人类可读体积（B/KB/MB/GB） */
export function formatSize(bytes) {
  if (bytes == null || isNaN(bytes)) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

/** 数字千分位格式化 */
export function formatNumber(n, fractionDigits = 0) {
  if (n == null || isNaN(n)) return '-'
  return Number(n).toLocaleString('zh-CN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })
}

/** 复制文本到剪贴板，返回是否成功 */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (e) {
    /* 降级到 execCommand */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch (e) {
    return false
  }
}

/** 截取文件名（去掉扩展名） */
export function stripExt(filename) {
  if (!filename) return ''
  const i = filename.lastIndexOf('.')
  return i > 0 ? filename.slice(0, i) : filename
}

/** 获取扩展名（小写，不带点） */
export function getExt(filename) {
  if (!filename) return ''
  const i = filename.lastIndexOf('.')
  return i > 0 ? filename.slice(i + 1).toLowerCase() : ''
}
