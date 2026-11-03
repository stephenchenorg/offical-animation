// 語音插件：Windows 內建語音（SAPI，System.Speech），優先挑 zh-TW 聲音（Hanhan／Yating／Zhiwei）
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { run } from '../../engine/media.mjs'

const PS = 'powershell.exe'
const VOICE = process.env.WIN_VOICE || '' // 指定聲音名稱，例：Microsoft Hanhan Desktop

function script(textFile, wav, rate) {
  const q = s => `'${s.replace(/'/g, "''")}'`
  return `
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$want = ${q(VOICE)}
$voices = $s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo }
$v = if ($want) { $voices | Where-Object { $_.Name -eq $want } | Select-Object -First 1 }
if (-not $v) { $v = $voices | Where-Object { $_.Culture.Name -eq 'zh-TW' } | Select-Object -First 1 }
if (-not $v) { $v = $voices | Where-Object { $_.Culture.Name -like 'zh-*' } | Select-Object -First 1 }
if ($v) { $s.SelectVoice($v.Name) }
$s.Rate = ${rate}
$s.SetOutputToWaveFile(${q(wav)})
$s.Speak([IO.File]::ReadAllText(${q(textFile)}, [Text.Encoding]::UTF8))
$s.Dispose()`
}

export default {
  name: 'tts-windows',
  type: 'tts',
  apiVersion: 1,
  description: 'Windows 內建語音（SAPI），自動挑中文聲音',
  platforms: ['win32'],
  install: '設定 → 時間與語言 → 語音 → 新增語音「中文(台灣)」',
  available: () => process.platform === 'win32' && !spawnSync(PS, ['-NoProfile', '-Command', 'exit 0']).error,
  synth(text, outBase, { speed = 1 } = {}) {
    // SAPI 的 Rate 是 -10～10，大約每 +1 快 10%：rate ≈ 10 × log3(speed)
    const rate = Math.max(-10, Math.min(10, Math.round(10 * Math.log(speed) / Math.log(3))))
    const txt = `${outBase}.txt`
    const wav = `${outBase}.wav`
    fs.writeFileSync(txt, text, 'utf8')
    run(PS, ['-NoProfile', '-NonInteractive', '-Command', script(txt, wav, rate)])
    return wav
  },
}
