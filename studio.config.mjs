// 全站設定：要載入哪些插件、預設主題、預設語音。
// 單一影片要不同設定 → 在 projects/<名稱>/studio.config.mjs 寫同樣格式（只寫要改的欄位）：
//   export default { theme: 'dark', plugins: ['./my-plugin'], disable: ['char-cat'] }
// 命令列 --theme dark / --tts edge 又會蓋過設定檔。插件怎麼寫、有哪些規範 → PLUGINS.md
export default {
  plugins: [
    // 語音：tts 設 auto 時，照這個順序挑第一個在這台電腦能用的
    './plugins/tts-say', //     macOS
    './plugins/tts-windows', // Windows
    './plugins/tts-edge', //    跨平台、Docker（需網路，pip install edge-tts）
    // 主題
    './plugins/theme-dark',
    // 人物
    './plugins/char-cat',
    // 錄影型的動作
    './plugins/step-basic',
  ],
  theme: 'light', // light ＝ 引擎原本的樣子；dark ＝ theme-dark 插件
  tts: 'auto',
}
