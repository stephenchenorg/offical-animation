#!/usr/bin/env node
// 開新影片：node new.js <名稱> [--錄影]
//   動畫型 → 複製 projects/_template；錄影型（真實網站分幕錄影）→ 複製 projects/_template-錄影
const fs = require('node:fs')
const path = require('node:path')

const args = process.argv.slice(2)
const name = args.find(a => !a.startsWith('--'))
const rec = args.includes('--錄影') || args.includes('--record')
if (!name) {
  console.log('用法：node new.js <名稱> [--錄影]（例：node new.js 某客戶-形象介紹；命名格式「客戶-主題」）')
  process.exit(1)
}
const from = path.join(__dirname, 'projects', rec ? '_template-錄影' : '_template')
const to = path.join(__dirname, 'projects', name)
if (fs.existsSync(to)) {
  console.error(`projects/${name} 已經存在`)
  process.exit(1)
}
fs.cpSync(from, to, { recursive: true, filter: src => !/[\\/](\.cache|\.studio\.html|output.*\.mp4|subs.*\.json|shots.*\.png)$/.test(src) })
console.log(rec
  ? `✔ 已建立 projects/${name}（錄影型），先寫 腳本.md，再改 video.config.mjs 和 scenes/`
  : `✔ 已建立 projects/${name}，先寫 腳本.md，再改 index.html`)
