// 把插件「插」進影片的 HTML：主題 CSS 放在 </head> 前（蓋過專案自己的樣式）、
// 人物插件的 script 放在 engine/characters.js 後面（專案的 Anim.cast() 才拿得到）。
// 產出同資料夾的 .studio.html，相對路徑（../../engine/…）照樣能用；原本的 index.html 不動。
import fs from 'node:fs'
import path from 'node:path'

export function buildHtml(dir, studio, file = 'index.html') {
  dir = path.resolve(dir)
  const src = path.join(dir, file)
  if (!fs.existsSync(src)) throw new Error(`找不到 ${src}`)
  let html = fs.readFileSync(src, 'utf8')
  const rel = p => path.relative(dir, p).split(path.sep).join('/')

  html = /<html[\s>]/i.test(html)
    ? html.replace(/<html([^>]*)>/i, `<html$1 data-theme="${studio.themeName}">`)
    : `<html data-theme="${studio.themeName}">${html}</html>`

  if (studio.theme) {
    const link = `<link rel="stylesheet" href="${rel(studio.theme.css)}" data-plugin="${studio.theme.name}">\n`
    html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${link}</head>`) : link + html
  }

  const chars = studio.characters.map(c => `<script src="${rel(c.script)}" data-plugin="${c.name}"></script>`).join('\n')
  if (chars) {
    const anchor = /<script[^>]*engine\/characters\.js[^>]*><\/script>/i
    html = anchor.test(html) ? html.replace(anchor, m => `${m}\n${chars}`) : html.replace(/<\/head>/i, `${chars}\n</head>`)
  }

  const out = path.join(dir, '.studio.html')
  fs.writeFileSync(out, html)
  return out
}
