// 錄影型影片的「分幕錄影」引擎。
//
// 為什麼要分幕：demo 的系統常常改版，某一頁改了不能整支重錄。所以每一幕各自錄成一段小影片放在
// .cache/scenes/，最後再接起來。改了哪一幕、或哪一頁改版了，只重錄跟它有關的幾幕。
//
// 專案結構（見 projects/_template-錄影）：
//   video.config.mjs   影片設定：舞台尺寸、要錄的網站視窗位置、頁面清單、分幕順序
//   index.html         舞台（字幕、步驟標題、網站視窗的外框），提供 window.S.<動作>()
//   scenes/NN-名稱.mjs 一幕一個檔：{ title, pages, prepare?, run }
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildHtml } from './html.mjs'
import { concatPath, duration, ffmpeg } from './media.mjs'
import { loadStudio, outName } from './plugins.mjs'

const FPS = 30
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const sha = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12)

// ── 讀專案：設定＋每一幕
export async function loadProject(dir, opts = {}) {
  dir = path.resolve(dir)
  const cfgFile = path.join(dir, 'video.config.mjs')
  if (!fs.existsSync(cfgFile)) throw new Error(`找不到 ${cfgFile}（錄影型專案才有；用 npm run new -- <名稱> --錄影 建立）`)
  const config = (await import(`${pathToFileURL(cfgFile).href}?v=${Date.now()}`)).default
  const studio = await loadStudio(dir, { theme: opts.theme, tts: opts.tts })
  const pageNames = Object.keys(config.pages ?? {})
  const stageSrc = fs.readFileSync(path.join(dir, config.stage ?? 'index.html'), 'utf8')

  const scenes = []
  for (const [i, rel] of (config.scenes ?? []).entries()) {
    const file = path.join(dir, rel)
    if (!fs.existsSync(file)) throw new Error(`video.config.mjs 列了 ${rel}，但檔案不存在`)
    const mod = (await import(`${pathToFileURL(file).href}?v=${Date.now()}`)).default
    if (typeof mod?.run !== 'function') throw new Error(`${rel} 要 export default { title, pages, run }`)
    const unknown = (mod.pages ?? []).filter(p => !pageNames.includes(p))
    if (unknown.length) throw new Error(`${rel} 的 pages 有 ${unknown.join('、')}，但 video.config.mjs 的 pages 沒登記`)
    const id = path.basename(rel, '.mjs')
    // 指紋：這幕的程式、舞台、主題有變 → 快取失效，要重錄
    const hash = sha([fs.readFileSync(file, 'utf8'), stageSrc, studio.themeName, JSON.stringify(config.windows ?? {})].join('\n'))
    scenes.push({ ...mod, id, no: i + 1, rel, file, hash, pages: mod.pages ?? [] })
  }
  const cacheDir = path.join(dir, '.cache', 'scenes', studio.themeName)
  for (const s of scenes) {
    s.clip = path.join(cacheDir, `${s.id}.mp4`)
    s.meta = path.join(cacheDir, `${s.id}.json`)
    const m = fs.existsSync(s.meta) && fs.existsSync(s.clip) ? JSON.parse(fs.readFileSync(s.meta, 'utf8')) : null
    s.status = !m ? 'missing' : m.hash !== s.hash ? 'changed' : 'cached'
    s.cached = m
  }
  return { dir, config, studio, scenes, cacheDir }
}

// ── 這次要錄哪幾幕
export function pick(project, { all, scene, page } = {}) {
  const { scenes } = project
  if (all) return scenes
  if (scene) {
    const keys = String(scene).split(',').map(s => s.trim())
    return scenes.filter(s => keys.some(k => s.id === k || s.id.startsWith(`${k}-`) || String(s.no) === k || s.id.startsWith(k.padStart(2, '0'))))
  }
  if (page) {
    const keys = String(page).split(',')
    const hit = scenes.filter(s => s.pages.some(p => keys.includes(p)))
    const unknown = keys.filter(k => !(k in (project.config.pages ?? {})))
    if (unknown.length) throw new Error(`video.config.mjs 的 pages 沒有：${unknown.join('、')}（有：${Object.keys(project.config.pages ?? {}).join('、')}）`)
    return hit
  }
  return scenes.filter(s => s.status !== 'cached')
}

export function table(project, chosen = []) {
  const mark = { cached: '✔ 已錄', changed: '⟳ 程式有改', missing: '✗ 還沒錄' }
  const lines = project.scenes.map((s) => {
    const sel = chosen.includes(s) ? '▶' : ' '
    const d = s.cached?.duration ? `${s.cached.duration.toFixed(1)}s` : '   -  '
    return `${sel} ${s.id.padEnd(22)} ${mark[s.status].padEnd(8)} ${d.padStart(6)}  頁面：${s.pages.join('、') || '-'}  ${s.title ?? ''}`
  })
  return lines.join('\n')
}

// ── 錄：整支只開一次瀏覽器，每一幕各自開關錄影
export async function record(project, chosen, { keep = false } = {}) {
  const { chromium, devices } = await import('playwright')
  const { dir, config, studio } = project
  const size = config.size ?? { width: 1920, height: 1080 }
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'scenes-'))
  fs.mkdirSync(project.cacheDir, { recursive: true })
  const tts = studio.tts()
  let probeN = 0
  const sayLen = (text) => duration(tts.synth(text, path.join(work, `probe${probeN++}`), { speed: config.speed ?? 1 }))

  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', ...(process.env.IN_DOCKER ? ['--no-sandbox'] : [])] })
  try {
    // 舞台：套了主題插件的 index.html
    const stageCtx = await browser.newContext({ viewport: size })
    const stage = await stageCtx.newPage()
    await stage.goto(pathToFileURL(buildHtml(dir, studio, config.stage ?? 'index.html')).href)
    await stage.waitForFunction(() => window.S)

    // 網站視窗：每個視窗一個獨立瀏覽器（各自登入、各自的 cookie）
    const win = {}
    for (const [name, w] of Object.entries(config.windows ?? {})) {
      const scale = w.scale ?? 1
      const ctx = await browser.newContext({
        ...(w.device ? devices[w.device] : {}),
        viewport: { width: w.width, height: w.height },
        deviceScaleFactor: scale,
      })
      await ctx.addInitScript(() => {
        // 點擊位置的漣漪提示（ctx.tap 會用到）
        window.__tap = (x, y) => {
          const d = document.createElement('div')
          d.style.cssText = `position:fixed;left:${x - 22}px;top:${y - 22}px;width:44px;height:44px;border-radius:50%;
            background:rgba(255,214,102,.55);border:3px solid #ffd666;z-index:2147483647;pointer-events:none;
            transition:transform .5s,opacity .5s;transform:scale(.6)`
          document.documentElement.appendChild(d)
          requestAnimationFrame(() => { d.style.transform = 'scale(1.4)'; d.style.opacity = '0' })
          setTimeout(() => d.remove(), 700)
        }
      })
      if (w.init) await w.init(ctx)
      win[name] = await ctx.newPage()
    }

    // 每一幕拿到的 ctx：舞台、視窗、旁白、點擊、輸入……加上 step 插件提供的動作
    let clock = null
    const ctx = {
      dir,
      theme: studio.themeName,
      stage,
      win,
      log,
      // 專案裡的本機檔案 → file:// 網址（#、? 後面的部分保留）
      file: (rel) => {
        const [, p, rest] = rel.match(/^([^#?]*)(.*)$/)
        return pathToFileURL(path.join(dir, p)).href + rest
      },
      S: (fn, ...args) => stage.evaluate(([fn, args]) => window.S[fn](...args), [fn, args]),
      wait: ms => stage.waitForTimeout(ms),
      async narrate(text, say = text) {
        if (!clock) throw new Error('narrate() 只能在 run() 裡用（prepare() 不錄影）')
        if (clock.now() < clock.speechEnd) await ctx.wait((clock.speechEnd - clock.now()) * 1000)
        const prev = clock.subs.at(-1)
        if (prev) prev.b = clock.now()
        await ctx.S('sub', text)
        const a = clock.now()
        clock.speechEnd = a + sayLen(say) + 0.4
        clock.subs.push({ a, b: null, text, say })
        log('  旁白', text)
      },
      async tap(page, loc, pause = 350) {
        await loc.scrollIntoViewIfNeeded().catch(() => {})
        const b = await loc.boundingBox()
        if (b) await page.evaluate(([x, y]) => window.__tap?.(x, y), [b.x + b.width / 2, b.y + b.height / 2])
        await page.waitForTimeout(pause)
        await loc.click()
      },
      async type(page, loc, text, delay = 110) {
        await ctx.tap(page, loc, 250)
        await loc.fill('')
        await loc.pressSequentially(text, { delay })
      },
    }
    for (const [name, fn] of Object.entries(studio.steps)) {
      if (name in ctx) throw new Error(`step 插件的動作「${name}」跟內建動作撞名`)
      ctx[name] = (...args) => fn(ctx, ...args)
    }

    if (config.setup) { log('準備（不錄）'); await config.setup(ctx) }

    for (const scene of chosen) {
      log(`▶ ${scene.id}${scene.title ? `｜${scene.title}` : ''}`)
      await ctx.S('reset')
      if (scene.prepare) await scene.prepare(ctx) // 不錄：把這一幕需要的狀態準備好，讓它能單獨重錄
      await studio.runHook('beforeScene', ctx, scene)

      const streams = { stage: await startCast(stage, work, `${scene.id}-stage`, size.width, size.height) }
      for (const [name, w] of Object.entries(config.windows ?? {}))
        streams[name] = await startCast(win[name], work, `${scene.id}-${name}`, w.width * (w.scale ?? 1), w.height * (w.scale ?? 1))
      await ctx.wait(400)
      const T0 = Math.min(...Object.values(streams).map(s => s.frames[0]?.t ?? Date.now() / 1000))
      clock = { now: () => Date.now() / 1000 - T0, speechEnd: 0, subs: [] }

      await scene.run(ctx)

      if (clock.now() < clock.speechEnd) await ctx.wait((clock.speechEnd - clock.now()) * 1000)
      await ctx.wait(config.tail ?? 400)
      const TEND = Date.now() / 1000
      if (clock.subs.at(-1)) clock.subs.at(-1).b = TEND - T0
      for (const s of Object.values(streams)) await s.cdp.send('Page.stopScreencast').catch(() => {})

      // 每條串流轉成影片，再把網站視窗疊到舞台上
      const v = { stage: toVideo(streams.stage, work, `${scene.id}-stage`, T0, TEND) }
      for (const [name, w] of Object.entries(config.windows ?? {}))
        v[name] = toVideo(streams[name], work, `${scene.id}-${name}`, T0, TEND, `${w.width}:${w.height}`)
      const names = Object.keys(config.windows ?? {})
      const filter = names.length
        ? names.map((n, i) => `${i ? `[s${i}]` : '[0]'}[${i + 1}]overlay=${config.windows[n].x}:${config.windows[n].y}${i === names.length - 1 ? ',format=yuv420p' : `[s${i + 1}]`}`).join(';')
        : 'format=yuv420p'
      const dur = (TEND - T0).toFixed(3)
      ffmpeg([...Object.values(v).flatMap(f => ['-i', f]), '-filter_complex', filter, '-t', dur, '-r', String(FPS),
        '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-an', scene.clip])
      const subs = clock.subs.map(s => ({ ...s, a: +s.a.toFixed(2), b: +s.b.toFixed(2) }))
      const meta = { id: scene.id, title: scene.title, pages: scene.pages, hash: scene.hash, duration: duration(scene.clip), recordedAt: new Date().toISOString(), subs }
      fs.writeFileSync(scene.meta, JSON.stringify(meta, null, 2))
      scene.status = 'cached'
      scene.cached = meta
      clock = null
      await studio.runHook('afterScene', ctx, scene, meta)
      log(`  ✔ ${meta.duration.toFixed(1)}s → ${path.relative(dir, scene.clip)}`)
    }
  }
  finally {
    await browser.close()
    if (!keep) fs.rmSync(work, { recursive: true, force: true })
  }
}

async function startCast(page, work, name, w, h) {
  const cdp = await page.context().newCDPSession(page)
  const d = path.join(work, name)
  fs.mkdirSync(d, { recursive: true })
  const frames = []
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = path.join(d, `${String(frames.length).padStart(6, '0')}.jpg`)
    fs.writeFileSync(file, Buffer.from(data, 'base64'))
    frames.push({ file, t: metadata.timestamp })
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: Math.round(w), maxHeight: Math.round(h), everyNthFrame: 1 })
  return { cdp, frames }
}

// screencast 只在畫面有變時送 frame：依時間戳排成 ffconcat，沒變的時間用前一張補
function toVideo({ frames }, work, name, T0, TEND, scale) {
  if (!frames.length) throw new Error(`${name} 一張畫面都沒錄到`)
  const lines = ['ffconcat version 1.0']
  frames.forEach((f, i) => {
    const start = i === 0 ? T0 : Math.max(f.t, T0)
    const end = i + 1 < frames.length ? frames[i + 1].t : TEND
    lines.push(`file ${concatPath(f.file)}`, `duration ${Math.max(end - start, 0.001).toFixed(4)}`)
  })
  lines.push(`file ${concatPath(frames.at(-1).file)}`)
  const list = path.join(work, `${name}.txt`)
  fs.writeFileSync(list, lines.join('\n'))
  const out = path.join(work, `${name}.mp4`)
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-vf', `${scale ? `scale=${scale},` : ''}fps=${FPS},format=yuv420p`,
    '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', out])
  return out
}

// ── 接起來：照 video.config.mjs 的順序把每幕的快取接成 output.mp4 ＋ subs.json
export async function assemble(project) {
  const { dir, scenes, studio } = project
  const notReady = scenes.filter(s => s.status !== 'cached')
  if (notReady.length) throw new Error(`還有幕沒錄好，不能接：${notReady.map(s => s.id).join('、')}`)
  if (!scenes.length) throw new Error('video.config.mjs 的 scenes 是空的')
  const list = path.join(project.cacheDir, 'concat.txt')
  fs.writeFileSync(list, ['ffconcat version 1.0', ...scenes.map(s => `file ${concatPath(s.clip)}`)].join('\n'))
  const out = path.join(dir, outName(studio.themeName, 'output', 'mp4'))
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out])

  let offset = 0
  const subs = []
  for (const s of scenes) {
    for (const x of s.cached.subs) subs.push({ ...x, a: +(x.a + offset).toFixed(2), b: +(x.b + offset).toFixed(2), scene: s.id })
    offset += s.cached.duration
  }
  fs.writeFileSync(path.join(dir, outName(studio.themeName, 'subs', 'json')), JSON.stringify(subs, null, 2))

  // 清掉已經不在 scenes 清單裡的舊快取（刪掉的幕）
  const keepIds = new Set(scenes.map(s => s.id))
  for (const f of fs.readdirSync(project.cacheDir)) {
    const id = f.replace(/\.(mp4|json)$/, '')
    if (f !== 'concat.txt' && !keepIds.has(id)) fs.rmSync(path.join(project.cacheDir, f))
  }
  await studio.runHook('afterRecord', { dir, out, theme: studio.themeName, scenes: scenes.map(s => s.cached) })
  return { out, duration: offset, subs: subs.length }
}
