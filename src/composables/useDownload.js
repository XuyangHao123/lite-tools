/**
 * 文件下载相关工具（统一各工具重复的 document.createElement('a') 逻辑）
 * - downloadBlob / downloadDataUrl：下载单个文件
 * - downloadMany：批量逐个下载（旧逻辑兼容）
 * - downloadZip：打包成 zip 下载（jszip 按需动态加载）
 * 所有函数都会在使用后 revokeObjectURL，避免内存泄漏。
 */

function triggerDownload(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'download'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/** 下载 Blob 对象 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename)
  // 延迟 revoke，确保下载已触发
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 下载 DataURL（如 canvas.toDataURL 的结果） */
export function downloadDataUrl(dataUrl, filename) {
  triggerDownload(dataUrl, filename)
}

/** 批量逐个下载（兼容旧的 setTimeout 链式触发，浏览器拦截风险仍在，推荐用 downloadZip） */
export function downloadMany(items, delay = 300) {
  items.forEach((it, i) => {
    setTimeout(() => {
      if (it.blob) downloadBlob(it.blob, it.name)
      else if (it.url || it.dataUrl) triggerDownload(it.url || it.dataUrl, it.name)
    }, i * delay)
  })
}

/**
 * 打包多个文件为 zip 下载
 * @param {Array<{blob:Blob,name:string}>} items
 * @param {string} zipName
 */
export async function downloadZip(items, zipName = 'download.zip') {
  if (!items.length) return
  // jszip 较大（~95KB），仅在真正需要时动态加载
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  // 处理重名文件
  const used = new Map()
  for (const it of items) {
    let name = it.name || 'file'
    if (used.has(name)) {
      used.set(name, used.get(name) + 1)
      const ext = name.lastIndexOf('.')
      if (ext > 0) {
        name = name.slice(0, ext) + `(${used.get(name)})` + name.slice(ext)
      } else {
        name = name + `(${used.get(name)})`
      }
    } else {
      used.set(name, 0)
    }
    zip.file(name, it.blob)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, zipName)
}
