// ffmpeg / ffprobe 小工具（Mac、Windows、Linux／Docker 共用）
// 找不到 ffmpeg 時可用環境變數 FFMPEG、FFPROBE 指定完整路徑
import { spawnSync } from 'node:child_process'

export const FFMPEG = process.env.FFMPEG || 'ffmpeg'
export const FFPROBE = process.env.FFPROBE || 'ffprobe'

export function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts })
  if (r.error?.code === 'ENOENT') throw new Error(`找不到指令 ${cmd}，請先安裝（npm run doctor 會告訴你怎麼裝）`)
  if (r.status !== 0) throw new Error(`${cmd} 執行失敗：${(r.stderr || '').slice(-800)}`)
  return r.stdout
}
export const has = cmd => !spawnSync(cmd, ['-version'], { encoding: 'utf8' }).error
export const ffmpeg = args => run(FFMPEG, ['-loglevel', 'error', '-y', ...args])
export const duration = f => Number(run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]))

// ffconcat 清單裡的路徑：一律用 /，單引號要跳脫（Windows 的 C:\ 路徑也能用）
export const concatPath = p => `'${p.split('\\').join('/').replace(/'/g, `'\\''`)}'`
