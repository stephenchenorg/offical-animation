#!/usr/bin/env node
// 開新影片：node new.js <名稱>  → 複製 projects/_template 成 projects/<名稱>
const fs = require('node:fs')
const path = require('node:path')

const name = process.argv[2]
if (!name) {
  console.log('用法：node new.js <名稱>（例：node new.js 某客戶-形象介紹；命名格式「客戶-主題」）')
  process.exit(1)
}
const from = path.join(__dirname, 'projects', '_template')
const to = path.join(__dirname, 'projects', name)
if (fs.existsSync(to)) {
  console.error(`projects/${name} 已經存在`)
  process.exit(1)
}
fs.cpSync(from, to, { recursive: true })
console.log(`✔ 已建立 projects/${name}，先寫 腳本.md，再改 index.html`)
