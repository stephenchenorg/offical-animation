#!/usr/bin/env node
// 環境檢查：npm run doctor → 列出這台電腦（Mac / Windows / Linux / Docker）缺什麼、怎麼裝
import fs from 'node:fs'
import { FFMPEG, FFPROBE, has } from './engine/media.mjs'
import { loadStudio } from './engine/plugins.mjs'

const os = { darwin: 'macOS', win32: 'Windows', linux: process.env.IN_DOCKER ? 'Docker（Linux）' : 'Linux' }[process.platform] ?? process.platform
const tip = {
  ffmpeg: { darwin: 'brew install ffmpeg', win32: 'winget install Gyan.FFmpeg（裝完重開終端機）', linux: 'apt install ffmpeg' },
  chromium: 'npx playwright install chromium',
}
let bad = 0
const line = (ok, label, hint = '') => {
  if (!ok) bad++
  console.log(`${ok ? '✔' : '✗'} ${label}${!ok && hint ? `\n    → ${hint}` : ''}`)
}

console.log(`作業系統：${os}　Node ${process.version}\n`)
line(Number(process.versions.node.split('.')[0]) >= 20, 'Node.js 20 以上', 'https://nodejs.org 下載 LTS')
line(has(FFMPEG), `ffmpeg（${FFMPEG}）`, tip.ffmpeg[process.platform])
line(has(FFPROBE), `ffprobe（${FFPROBE}）`, '跟 ffmpeg 一起裝')

// 真的開一次瀏覽器（比檢查路徑準：headless 版的執行檔位置跟一般版不同）
const noSandbox = process.env.IN_DOCKER ? ['--no-sandbox'] : []
try {
  const { chromium } = await import('playwright')
  const b = await chromium.launch({ args: noSandbox })
  await b.close()
  line(true, 'Playwright Chromium（錄影型用）')
}
catch { line(false, 'Playwright Chromium（錄影型用）', tip.chromium) }
try {
  const puppeteer = (await import('puppeteer')).default
  const b = await puppeteer.launch({ args: noSandbox })
  await b.close()
  line(true, 'Puppeteer Chrome（動畫型用）')
}
catch { line(false, 'Puppeteer Chrome（動畫型用）', 'npx puppeteer browsers install chrome') }

try {
  const studio = await loadStudio(null)
  console.log(`\n插件（studio.config.mjs）：${studio.plugins.length} 個都符合規範`)
  for (const p of studio.plugins.filter(p => p.type === 'tts')) {
    const fits = !p.platforms || p.platforms.includes(process.platform)
    const ok = fits && p.available()
    console.log(`  ${ok ? '✔' : '・'} ${p.name}：${p.description}${!ok && fits ? `（沒裝：${p.install}）` : ''}${!fits ? '（這個作業系統不適用）' : ''}`)
  }
  try { console.log(`  → 旁白會用：${studio.tts().name}`) }
  catch (e) { line(false, '可用的語音', e.message) }
}
catch (e) { line(false, '插件設定', e.message) }

console.log(bad ? `\n有 ${bad} 項要處理` : '\n全部 OK')
process.exit(bad ? 1 : 0)
