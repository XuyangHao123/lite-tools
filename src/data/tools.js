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
  },
  {
    key: 'password-generator',
    name: '密码生成器',
    desc: '免费在线生成随机密码，支持自定义长度和字符类型，使用加密安全随机数，本地生成不上传。',
    keywords: '密码生成器,随机密码,强密码生成,密码工具',
    icon: 'Lock',
    component: () => import('@/views/tools/PasswordGenerator.vue')
  },
  {
    key: 'base64',
    name: 'Base64 编解码',
    desc: '免费在线 Base64 编码与解码工具，支持文本双向转换和中文（UTF-8），本地运行安全可靠。',
    keywords: 'Base64,编码,解码,Base64转换,在线工具',
    icon: 'Key',
    component: () => import('@/views/tools/Base64Tool.vue')
  },
  {
    key: 'json-formatter',
    name: 'JSON 格式化',
    desc: '免费在线 JSON 格式化、压缩、校验工具，支持错误提示和缩进设置，开发者必备。',
    keywords: 'JSON格式化,JSON压缩,JSON校验,JSON美化,在线工具',
    icon: 'Document',
    component: () => import('@/views/tools/JsonFormatter.vue')
  },
  {
    key: 'unit-converter',
    name: '单位换算',
    desc: '免费在线单位换算工具，支持长度、重量、温度、面积等多种单位互转，快速准确。',
    keywords: '单位换算,长度换算,重量换算,温度换算,面积换算,在线工具',
    icon: 'ScaleToOriginal',
    component: () => import('@/views/tools/UnitConverter.vue')
  },
  {
    key: 'bmi-calculator',
    name: 'BMI 计算器',
    desc: '免费在线 BMI 身体质量指数计算器，输入身高体重即可计算，附中国标准健康范围参考。',
    keywords: 'BMI计算器,身体质量指数,体重计算,健康工具',
    icon: 'FirstAidKit',
    component: () => import('@/views/tools/BmiCalculator.vue')
  }
]

/** 根据 key 获取工具信息 */
export function getTool(key) {
  return tools.find((t) => t.key === key)
}
