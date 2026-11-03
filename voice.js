#!/usr/bin/env node
// 加旁白：node voice.js projects/<名稱> [--voice Meijia] [--rate 190]
//   → 把 index.html 裡每句字幕（.sub）念成語音，放在字幕出現的時間點，合進 output.mp4 → output-voice.mp4
// 前提：先跑過 node render.js 產生 output.mp4；只能在 macOS 跑（用內建的 say 語音）
// 念法跟字幕不一樣時（數字、英文縮寫、符號），在字幕元素上加 data-say="要念的字"
// 錄影型專案（字幕時間在錄影當下才決定）改讀專案裡的 subs.json：[{ a, b, text, say? }]
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const MAX_RATE = 260 // 再快就聽不清楚，超過的只警告、不再加速

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`${cmd} 執行失敗：${r.stderr}`)
  return r.stdout
}
const duration = f => Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]))

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

function main() {
  const args = process.argv.slice(2)
  const dir = args[0]
  const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : null)
  const voice = opt('--voice') || 'Meijia'
  const baseRate = Number(opt('--rate') || 190)
  if (!dir) {
    console.log('用法：node voice.js projects/<名稱> [--voice Meijia] [--rate 190]')
    process.exit(1)
  }
  const video = path.resolve(dir, 'output.mp4')
  if (!fs.existsSync(video)) throw new Error(`找不到 ${video}，請先跑 node render.js ${dir}`)
  const json = path.resolve(dir, 'subs.json')
  const subs = fs.existsSync(json)
    ? JSON.parse(fs.readFileSync(json, 'utf8')).map(s => ({ a: s.a, b: s.b, text: s.say || s.text }))
    : subtitles(fs.readFileSync(path.resolve(dir, 'index.html'), 'utf8'))
  if (subs.length === 0) throw new Error('找不到字幕（index.html 的 .sub 或 subs.json）')

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-'))
  try {
    const clips = subs.map((s, i) => {
      const f = path.join(tmp, `v${i}.aiff`)
      const room = s.b - s.a - 0.2
      let rate = baseRate
      run('say', ['-v', voice, '-r', String(rate), '-o', f, s.text])
      let len = duration(f)
      if (len > room) {
        rate = Math.min(MAX_RATE, Math.ceil(rate * len / room))
        run('say', ['-v', voice, '-r', String(rate), '-o', f, s.text])
        len = duration(f)
      }
      const warn = len > room + 0.2 ? `  ⚠️ 念完要 ${len.toFixed(1)} 秒，字幕只有 ${(s.b - s.a).toFixed(1)} 秒` : ''
      console.log(`${s.a.toFixed(1).padStart(6)}s  語速 ${rate}  ${s.text}${warn}`)
      return { f, ms: Math.round(s.a * 1000) }
    })

    const inputs = clips.flatMap(c => ['-i', c.f])
    const delays = clips.map((c, i) => `[${i + 1}]adelay=${c.ms}|${c.ms}[a${i}]`).join(';')
    const mix = `${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0,apad=whole_dur=${duration(video)}[aout]`
    const out = path.resolve(dir, 'output-voice.mp4')
    run('ffmpeg', ['-loglevel', 'error', '-y', '-i', video, ...inputs, '-filter_complex', `${delays};${mix}`,
      // 靜音只補到影片長度（apad 不給長度會無限補下去，ffmpeg 8 配 -shortest 收不了尾）
      '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', out])
    console.log(`✔ ${clips.length} 句旁白 → ${out}`)
  }
  finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

try { main() }
catch (e) { console.error(e.message); process.exit(1) }
