/**
 * 图片处理通用逻辑（消除 7 处重复的 loadImage / canvasToBlob 等）
 */

/** MIME → 扩展名映射（统一常量） */
export const IMAGE_EXT_MAP = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp'
}

/** 扩展名 → MIME 反查 */
const EXT_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp'
}

export function extToMime(ext) {
  return EXT_TO_MIME[ext?.toLowerCase()] || 'image/png'
}

export function mimeToExt(mime) {
  return IMAGE_EXT_MAP[mime] || 'png'
}

/** 从 File/Blob 加载为 HTMLImageElement（Promise 封装） */
export function loadImage(raw) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(raw)
    const img = new Image()
    img.onload = () => {
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}

/** 创建指定尺寸的 canvas（JPG 自动填白底） */
export function createCanvas(w, h, fillBackground = false) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(w))
  canvas.height = Math.max(1, Math.floor(h))
  const ctx = canvas.getContext('2d')
  if (fillBackground) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  return { canvas, ctx }
}

/**
 * canvas → Blob（异步，比 toDataURL+fetch 更省内存且不卡 UI）
 * 注意：toBlob 在部分浏览器对 webp 质量参数支持不一致
 */
export function canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('导出图片失败'))
      },
      type,
      quality
    )
  })
}

/** canvas → DataURL（个别工具仍需 dataURL 时使用） */
export function canvasToDataUrl(canvas, type = 'image/png', quality = 0.92) {
  return canvas.toDataURL(type, quality)
}

/** JPG/JPEG 输出时给透明区域填白底（PNG/WebP 保持透明） */
export function fillWhiteBg(ctx, w, h) {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
}
