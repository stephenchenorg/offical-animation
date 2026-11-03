#!/usr/bin/env node
// 加旁白：node voice.js projects/<名稱> [--theme dark] [--tts say|windows|edge] [--speed 1]
//   → 把每句字幕念成語音，放在字幕出現的時間點，合進 output.mp4 → output-voice.mp4
//     （--theme dark 時讀 output-dark.mp4 → output-dark-voice.mp4）
// 語音來源是 tts 插件（studio.config.mjs）：Mac 用 say、Windows 用內建語音、Docker 用 edge-tts
// 念法跟字幕不一樣時（數字、英文縮寫、符號），在字幕元素上加 data-say="要念的字"
// 錄影型專案（字幕時間在錄影當下才決定）改讀專案裡的 subs.json：[{ a, b, text, say? }]
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const MAX_SPEED = 260 / 190 // 再快就聽不清楚，超過的只警告、不再加速

function subtitles(html) {
  const re = /<div class="abs sub[^"]*"([^>]*)><span>([\s\S]*?)<\/span><\/div>/g
  const list = []
  for (const [, attrs, inner] of html.matchAll(re)) {
    const show = attrs.match(/data-show="([\d.]+),([\d.]+)"/)
    if (!show) continue
    const say = attrs.match(/data-say="([^"]*)"/)
    const text = say
      ? say[1]
      : inner.replace(/<b>[\s\S]*?<\/b>/g, '').replace(/<br\s*\/?>/g, '').replace(/<[^>]+>/g, '').trim()
    list.push({ a: Number(show[1]), b: Number(show[2]), text })
  }
  return list.sort((x, y) => x.a - y.a)
}

async function main() {
  const args = process.argv.slice(2)
  const dir = args[0]
  const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined)
  if (!dir) {
    console.log('用法：node voice.js projects/<名稱> [--theme dark] [--tts say|windows|edge] [--speed 1]')
    process.exit(1)
  }
  const { loadStudio, outName } = await import('./engine/plugins.mjs')
  const { ffmpeg, duration } = await import('./engine/media.mjs')
  const studio = await loadStudio(dir, { theme: opt('--theme'), tts: opt('--tts') })
  const tts = studio.tts()
  // 舊參數 --rate 190 仍可用（換算成速度倍率）
  const baseSpeed = Number(opt('--speed') || (opt('--rate') ? Number(opt('--rate')) / 190 : 1))

  const video = path.resolve(dir, outName(studio.themeName, 'output', 'mp4'))
  if (!fs.existsSync(video)) throw new Error(`找不到 ${video}，請先跑 render（動畫型）或 record（錄影型）`)
  const json = path.resolve(dir, outName(studio.themeName, 'subs', 'json'))
  const subs = fs.existsSync(json)
    ? JSON.parse(fs.readFileSync(json, 'utf8')).map(s => ({ a: s.a, b: s.b, text: s.say || s.text }))
    : subtitles(fs.readFileSync(path.resolve(dir, 'index.html'), 'utf8'))
  if (subs.length === 0) throw new Error('找不到字幕（index.html 的 .sub 或 subs.json）')
  console.log(`語音：${tts.name}`)

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-'))
  try {
    const clips = subs.map((s, i) => {
      const room = s.b - s.a - 0.2
      let speed = baseSpeed
      let f = tts.synth(s.text, path.join(tmp, `v${i}`), { speed })
      let len = duration(f)
      if (len > room) {
        speed = Math.min(MAX_SPEED, speed * len / room * 1.02)
        f = tts.synth(s.text, path.join(tmp, `v${i}`), { speed })
        len = duration(f)
      }
      const warn = len > room + 0.2 ? `  ⚠️ 念完要 ${len.toFixed(1)} 秒，字幕只有 ${(s.b - s.a).toFixed(1)} 秒` : ''
      console.log(`${s.a.toFixed(1).padStart(6)}s  速度 ×${speed.toFixed(2)}  ${s.text}${warn}`)
      return { f, ms: Math.round(s.a * 1000) }
    })

    const inputs = clips.flatMap(c => ['-i', c.f])
    const delays = clips.map((c, i) => `[${i + 1}]adelay=${c.ms}|${c.ms}[a${i}]`).join(';')
    const mix = `${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0,apad=whole_dur=${duration(video)}[aout]`
    const out = path.resolve(dir, outName(studio.themeName, 'output', 'mp4').replace(/\.mp4$/, '-voice.mp4'))
    ffmpeg(['-i', video, ...inputs, '-filter_complex', `${delays};${mix}`,
      // 靜音只補到影片長度（apad 不給長度會無限補下去，ffmpeg 8 配 -shortest 收不了尾）
      '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', out])
    console.log(`✔ ${clips.length} 句旁白 → ${out}`)
  }
  finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

main().catch((e) => { console.error(e.message); process.exit(1) })
