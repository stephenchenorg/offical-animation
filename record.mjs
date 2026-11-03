#!/usr/bin/env node
// 錄影型影片：分幕錄影＋接成一支
//
//   node record.mjs projects/<名稱>                    只錄「還沒錄」或「程式有改」的幕，再接起來
//   node record.mjs projects/<名稱> --list             只列出每一幕的狀態，不錄
//   node record.mjs projects/<名稱> --page dashboard   系統的 dashboard 頁改版了 → 重錄所有用到它的幕
//   node record.mjs projects/<名稱> --scene 2,5        指定重錄第 2、5 幕（編號或檔名開頭）
//   node record.mjs projects/<名稱> --all              整支重錄
//   加 --dry   只列出「會重錄哪幾幕」，不真的錄（改版前先看影響範圍）
//   加 --theme dark   錄深色版（快取跟淺色版分開，互不影響）
//   加 --keep  保留暫存的畫面檔（除錯用）
import path from 'node:path'
import { assemble, loadProject, pick, record, table } from './engine/recorder.mjs'

const args = process.argv.slice(2)
const dir = args[0]
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined)
const flag = k => args.includes(k)

if (!dir || dir.startsWith('--')) {
  console.log('用法：node record.mjs projects/<名稱> [--list] [--page 頁面] [--scene 2,5] [--all] [--dry] [--theme dark]')
  process.exit(1)
}

try {
  const project = await loadProject(dir, { theme: opt('--theme'), tts: opt('--tts') })
  const chosen = flag('--list') ? [] : pick(project, { all: flag('--all'), scene: opt('--scene'), page: opt('--page') })
  console.log(`${path.basename(project.dir)}（${project.studio.themeName}）\n${table(project, chosen)}`)
  if (flag('--list')) process.exit(0)
  if (flag('--dry')) {
    console.log(chosen.length ? `\n會重錄 ${chosen.length} 幕（▶），其他幕直接用快取。` : '\n全部都是最新的，不用重錄。')
    process.exit(0)
  }
  if (chosen.length) {
    console.log(`\n要錄 ${chosen.length} 幕，其他 ${project.scenes.length - chosen.length} 幕用快取\n`)
    await record(project, chosen, { keep: flag('--keep') })
  }
  else console.log('\n全部都是最新的，直接接起來')
  const r = await assemble(project)
  console.log(`\n✔ ${r.duration.toFixed(1)} 秒、${r.subs} 句字幕 → ${r.out}`)
  console.log(`  加旁白：npm run voice -- ${dir}${project.studio.themeName === 'light' ? '' : ` --theme ${project.studio.themeName}`}`)
}
catch (e) {
  console.error(e.message)
  process.exit(1)
}
