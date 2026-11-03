// 語音插件：macOS 內建 say（預設聲音美佳）
import { spawnSync } from 'node:child_process'
import { run } from '../../engine/media.mjs'

const VOICE = process.env.SAY_VOICE || 'Meijia'
const BASE_RATE = 190 // say 的 -r：每分鐘字數，190 是原本影片用的速度

export default {
  name: 'tts-say',
  type: 'tts',
  apiVersion: 1,
  description: 'macOS 內建 say 語音（美佳）',
  platforms: ['darwin'],
  install: 'macOS 內建；系統設定 → 輔助使用 → 朗讀內容 → 下載「美佳」',
  available: () => process.platform === 'darwin' && !spawnSync('say', ['-v', '?'], { encoding: 'utf8' }).error,
  // speed：1 ＝ 正常速度，1.2 ＝ 快 20%
  synth(text, outBase, { speed = 1 } = {}) {
    const f = `${outBase}.aiff`
    run('say', ['-v', VOICE, '-r', String(Math.round(BASE_RATE * speed)), '-o', f, text])
    return f
  },
}
