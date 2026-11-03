// 語音插件：微軟 Edge 線上語音（edge-tts），Mac／Windows／Linux／Docker 都能用，需要網路
// 安裝：pip install edge-tts（Docker 映像檔已內建）
import { spawnSync } from 'node:child_process'
import { run } from '../../engine/media.mjs'

const VOICE = process.env.EDGE_VOICE || 'zh-TW-HsiaoChenNeural'
const BIN = process.env.EDGE_TTS || 'edge-tts'

export default {
  name: 'tts-edge',
  type: 'tts',
  apiVersion: 1,
  description: '微軟 Edge 線上語音（曉臻），跨平台、需要網路',
  install: 'pip install edge-tts',
  available: () => !spawnSync(BIN, ['--help'], { encoding: 'utf8' }).error,
  synth(text, outBase, { speed = 1 } = {}) {
    const f = `${outBase}.mp3`
    const pct = Math.round((speed - 1) * 100)
    run(BIN, ['--voice', VOICE, `--rate=${pct >= 0 ? '+' : ''}${pct}%`, '--text', text, '--write-media', f])
    return f
  },
}
