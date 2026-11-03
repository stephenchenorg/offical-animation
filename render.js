#!/usr/bin/env node
// 輸出 MP4：   node render.js projects/<名稱> [--theme dark]          → output.mp4（深色：output-dark.mp4）
// 檢查畫面：   node render.js projects/<名稱> --shots 3,10,20 [--theme dark] → shots.png（多個時間點拼成一張）
// 做法：用無頭 Chrome 把動畫定格在每 1/30 秒拍一張，再用 ffmpeg 串成影片（直接錄螢幕會掉格）
// 插件（主題、人物）由 studio.config.mjs 決定，會先合成 .studio.html 再拍；原本的 index.html 不動
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const puppeteer = require('puppeteer')

const FPS = 30

async function main() {
  const args = process.argv.slice(2)
  const dir = args[0]
  const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined)
  if (!dir) {
    console.log('用法：node render.js projects/<名稱> [--shots 3,10,20] [--theme dark]')
    process.exit(1)
  }
  const { loadStudio, outName } = await import('./engine/plugins.mjs')
  const { buildHtml } = await import('./engine/html.mjs')
  const { ffmpeg } = await import('./engine/media.mjs')
  const studio = await loadStudio(dir, { theme: opt('--theme') })
  const html = buildHtml(dir, studio)

  const browser = await puppeteer.launch({ args: process.env.IN_DOCKER ? ['--no-sandbox'] : [] })
  const page = await browser.newPage()
  page.on('pageerror', e => console.error('頁面錯誤：', e.message))
  const url = `${pathToFileURL(html).href}?record&t=0`
  await page.goto(url)
  await page.waitForFunction(() => window.seek && window.ANIM_TOTAL)
  const size = await page.evaluate(() => {
    const s = document.getElementById('stage')
    return { width: s.offsetWidth, height: s.offsetHeight, total: window.ANIM_TOTAL }
  })
  await page.setViewport({ width: size.width, height: size.height })
  await page.goto(url)
  await page.waitForFunction(() => window.seek)

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anim-'))
  try {
    if (args.includes('--shots')) {
      const times = (opt('--shots') || '0').split(',').map(Number)
      const files = []
      for (const [i, t] of times.entries()) {
        await page.evaluate(v => window.seek(v), t)
        const f = path.join(tmp, `s${i}.jpg`)
        await page.screenshot({ path: f, type: 'jpeg', quality: 85 })
        files.push(f)
      }
      const out = path.resolve(dir, outName(studio.themeName, 'shots', 'png'))
      const inputs = files.flatMap(f => ['-i', f])
      const filter = files.length > 1
        ? `${files.map((_, i) => `[${i}]`).join('')}hstack=${files.length},scale=-1:800`
        : 'scale=-1:800'
      ffmpeg([...inputs, '-filter_complex', filter, out])
      console.log(`✔ ${times.join('、')} 秒的畫面（${studio.themeName}）→ ${out}`)
    }
    else {
      const frames = Math.round(size.total * FPS)
      for (let i = 0; i < frames; i++) {
        await page.evaluate(v => window.seek(v), i / FPS)
        await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 })
        if (i % FPS === 0) process.stdout.write(`\r拍攝中 ${i / FPS}/${size.total} 秒`)
      }
      const out = path.resolve(dir, outName(studio.themeName, 'output', 'mp4'))
      ffmpeg(['-framerate', String(FPS), '-i', path.join(tmp, 'f%05d.jpg'),
        '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out])
      console.log(`\n✔ ${size.width}×${size.height}、${size.total} 秒（${studio.themeName}）→ ${out}`)
      await studio.runHook('afterRender', { dir: path.resolve(dir), out, theme: studio.themeName })
    }
  }
  finally {
    await browser.close()
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

main().catch((e) => { console.error(e.message); process.exit(1) })
