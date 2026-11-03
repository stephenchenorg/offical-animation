// 插件載入器：讀 studio.config.mjs（全站）＋ projects/<名稱>/studio.config.mjs（這支影片，可省略），
// 依規範檢查每個插件，整理成 render / voice / record 用得到的形狀。插件規範見 PLUGINS.md。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const API_VERSION = 1
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TYPES = ['theme', 'tts', 'character', 'step', 'hook']
const HOOKS = ['beforeScene', 'afterScene', 'afterRecord', 'afterRender']
const NAME = /^[a-z0-9][a-z0-9-]*$/

async function readConfig(file) {
  if (!fs.existsSync(file)) return {}
  const mod = await import(pathToFileURL(file).href)
  return { ...mod.default, __dir: path.dirname(file) }
}

function resolveEntry(entry, baseDir) {
  const p = path.resolve(baseDir, entry)
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return path.join(p, 'index.mjs')
  return p
}

// 規範檢查：不合格就丟錯，訊息寫清楚是哪個插件、哪一條
export function validate(plugin, file) {
  const fail = msg => { throw new Error(`插件不合規範（${path.relative(ROOT, file)}）：${msg}`) }
  if (!plugin || typeof plugin !== 'object') fail('要用 export default 匯出一個物件')
  if (!NAME.test(plugin.name ?? '')) fail('name 必填，只能用小寫英文、數字、-（例：theme-dark）')
  if (!TYPES.includes(plugin.type)) fail(`type 必須是 ${TYPES.join(' / ')} 其中一個`)
  if (plugin.apiVersion !== API_VERSION) fail(`apiVersion 必須是 ${API_VERSION}（目前引擎版本）`)
  if (typeof plugin.description !== 'string' || !plugin.description) fail('description 必填，一句話說明這個插件做什麼')
  if (plugin.platforms && !plugin.platforms.every(p => ['darwin', 'win32', 'linux'].includes(p)))
    fail('platforms 只能放 darwin / win32 / linux')
  const dir = path.dirname(file)
  const asset = (key) => {
    if (typeof plugin[key] !== 'string') fail(`${plugin.type} 插件要有 ${key}（相對於插件資料夾的檔案路徑）`)
    const p = path.resolve(dir, plugin[key])
    if (!fs.existsSync(p)) fail(`${key} 指到的檔案不存在：${plugin[key]}`)
    return p
  }
  const out = { ...plugin, file, dir }
  if (plugin.type === 'theme') out.css = asset('css')
  if (plugin.type === 'character') {
    out.script = asset('script')
    if (!Array.isArray(plugin.provides) || !plugin.provides.length) fail('character 插件要用 provides 列出它加到 Anim 上的函式名稱')
  }
  if (plugin.type === 'tts') {
    for (const k of ['available', 'synth']) if (typeof plugin[k] !== 'function') fail(`tts 插件要有 ${k}() 函式`)
  }
  if (plugin.type === 'step') {
    if (!plugin.steps || !Object.values(plugin.steps).every(f => typeof f === 'function')) fail('step 插件要有 steps: { 名稱: async (ctx, ...參數) => {} }')
  }
  if (plugin.type === 'hook') {
    const keys = Object.keys(plugin.hooks ?? {})
    if (!keys.length) fail(`hook 插件要有 hooks，可用：${HOOKS.join(' / ')}`)
    const bad = keys.filter(k => !HOOKS.includes(k))
    if (bad.length) fail(`不認得的 hook：${bad.join('、')}（可用：${HOOKS.join(' / ')}）`)
  }
  return out
}

// 讀設定 → 載入插件 → 選出這次要用的主題、語音
// opts.theme / opts.tts：命令列指定的值，優先於設定檔
export async function loadStudio(projectDir, opts = {}) {
  const global = await readConfig(path.join(ROOT, 'studio.config.mjs'))
  const local = projectDir ? await readConfig(path.join(path.resolve(projectDir), 'studio.config.mjs')) : {}
  const entries = [
    ...(global.plugins ?? []).map(e => resolveEntry(e, global.__dir)),
    ...(local.plugins ?? []).map(e => resolveEntry(e, local.__dir)),
  ]
  const disabled = new Set(local.disable ?? [])

  const plugins = []
  for (const file of [...new Set(entries)]) {
    if (!fs.existsSync(file)) throw new Error(`studio.config.mjs 裡的插件找不到：${path.relative(ROOT, file)}`)
    const p = validate((await import(pathToFileURL(file).href)).default, file)
    if (disabled.has(p.name)) continue
    if (plugins.some(q => q.name === p.name)) throw new Error(`插件名稱重複：${p.name}`)
    plugins.push(p)
  }
  const byType = t => plugins.filter(p => p.type === t)

  // 主題：light / default ＝ 不套插件（引擎原本的樣子）
  const themeName = opts.theme ?? local.theme ?? global.theme ?? 'light'
  let theme = null
  if (!['light', 'default'].includes(themeName)) {
    theme = byType('theme').find(p => p.name === themeName || p.name === `theme-${themeName}`)
    if (!theme) throw new Error(`找不到主題「${themeName}」，已載入的主題：${byType('theme').map(p => p.name).join('、') || '（沒有）'}`)
  }

  // 語音：auto ＝ 依設定檔順序，挑第一個在這台電腦能用的
  const ttsName = opts.tts ?? local.tts ?? global.tts ?? 'auto'
  const ttsList = byType('tts').filter(p => !p.platforms || p.platforms.includes(process.platform))
  const pickTts = () => {
    if (ttsName !== 'auto') {
      const t = byType('tts').find(p => p.name === ttsName || p.name === `tts-${ttsName}`)
      if (!t) throw new Error(`找不到語音插件「${ttsName}」`)
      if (!t.available()) throw new Error(`語音插件 ${t.name} 在這台電腦不能用：${t.install ?? ''}`)
      return t
    }
    const t = ttsList.find(p => p.available())
    if (!t) throw new Error(`這台電腦沒有可用的語音插件。可以裝：\n${byType('tts').map(p => `  ・${p.name}：${p.install ?? ''}`).join('\n')}`)
    return t
  }

  const steps = Object.assign({}, ...byType('step').map(p => p.steps))
  const hooks = byType('hook')
  return {
    plugins,
    theme,
    themeName: theme ? themeName.replace(/^theme-/, '') : 'light',
    characters: byType('character'),
    steps,
    tts: pickTts,
    async runHook(name, ...args) {
      for (const h of hooks) if (h.hooks[name]) await h.hooks[name](...args)
    },
  }
}

// 輸出檔名：淺色＝output.mp4，其他主題＝output-dark.mp4
export const outName = (themeName, base, ext) => `${base}${themeName === 'light' ? '' : `-${themeName}`}.${ext}`
