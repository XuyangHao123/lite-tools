/**
 * 从 src/data/tools.js 自动生成 public/sitemap.xml
 * 用法：node scripts/gen-sitemap.mjs [username]
 * 默认用户名：xuyanghao123
 */
import { writeFileSync } from 'node:fs'
import { tools } from '../src/data/tools.js'

const username = process.argv[2] || 'xuyanghao123'
const today = new Date().toISOString().slice(0, 10)
const base = `https://${username}.github.io/lite-tools`

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
xml += '<!-- 站点地图，由 scripts/gen-sitemap.mjs 自动生成，请勿手动编辑 -->\n'
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
xml += `  <url>\n    <loc>${base}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n`
for (const t of tools) {
  xml += `  <url><loc>${base}/${t.key}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n`
}
xml += '</urlset>\n'

writeFileSync('public/sitemap.xml', xml)
console.log(`✓ sitemap.xml 已生成：${tools.length} 个工具 + 首页（域名 ${username}）`)
