/**
 * 工具元数据
 * 每新增一个工具，在此数组追加一项即可自动出现在首页和路由中。
 * 字段说明：
 *  - key:       唯一标识，同时作为路由 path
 *  - name:      工具名称（中文）
 *  - desc:      简短描述（用于首页卡片 + SEO description）
 *  - keywords:  关键词（用于 SEO）
 *  - icon:      Element Plus 图标名（首页卡片用）
 *  - component: 路由懒加载的组件路径
 */
export const tools = [
  {
    key: 'qr-generator',
    name: '二维码生成器',
    desc: '免费在线生成二维码，支持自定义颜色、尺寸、容错级别，可下载高清PNG。',
    keywords: '二维码生成器,QR码,在线生成二维码,免费二维码',
    icon: 'Grid',
    component: () => import('@/views/tools/QrGenerator.vue')
  }
]

/** 根据 key 获取工具信息 */
export function getTool(key) {
  return tools.find((t) => t.key === key)
}
