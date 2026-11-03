# 插件規範

## 先用一句話理解

插件就像**相機的鏡頭和濾鏡**：機身（`engine/`、`render.js`、`record.mjs`、`voice.js`）不動，想換配色就裝一片「深色濾鏡」（theme），想換聲音就換一支「麥克風」（tts），想多一個角色就加一個「演員」（character）。裝哪些寫在 `studio.config.mjs`，拿掉那一行就卸下來，影片原檔完全不用改。

## 怎麼裝、怎麼卸

```js
// studio.config.mjs（全站）
export default {
  plugins: ['./plugins/tts-say', './plugins/theme-dark', './plugins/char-cat'],
  theme: 'light', // 或 'dark'
  tts: 'auto', //    或 'say' / 'windows' / 'edge'
}

// projects/<名稱>/studio.config.mjs（只影響這支片，可省略；只寫要改的欄位）
export default {
  theme: 'dark',
  plugins: ['./plugins/my-logo'], // 加在全站清單後面，路徑相對於這個檔
  disable: ['char-cat'], //          全站有載、這支片不要
}
```

優先順序：命令列（`--theme dark`、`--tts edge`）＞ 專案設定 ＞ 全站設定。

## 規範（載入時會自動檢查，不合格直接報錯、不會默默跳過）

每個插件是 `plugins/<名稱>/index.mjs`，`export default` 一個物件：

| 欄位 | 必填 | 規則 |
|------|------|------|
| `name` | ✔ | 小寫英文、數字、`-`；全站不能重複。建議用種類當前綴：`theme-`、`tts-`、`char-`、`step-`、`hook-` |
| `type` | ✔ | `theme` / `tts` / `character` / `step` / `hook` |
| `apiVersion` | ✔ | 目前是 `1`。引擎改了插件介面才會升版，舊插件會被擋下並提示 |
| `description` | ✔ | 一句話說明做什麼（`npm run doctor` 會列出來） |
| `platforms` | | 只在某些系統能用時填：`['darwin']`、`['win32']`、`['linux']` |

另外四條共同規則：

1. **載入時不能有副作用**：import 這個檔只能回傳物件，不能開瀏覽器、寫檔、連網路。真正的事情放在函式裡。
2. **不改別人的東西**：插件只能動自己資料夾裡的檔案、只加自己 `provides` 宣告過的名稱。
3. **不能改客戶專案的原檔**：`index.html`、`scenes/`、`腳本.md` 只能讀。
4. **不放機敏資料**：帳號、token 走環境變數或專案裡不進 git 的 `accounts.json`。

## 五種插件怎麼寫

### theme：配色

```js
export default { name: 'theme-dark', type: 'theme', apiVersion: 1, description: '深色主題', css: 'theme.css' }
```

- `css` 會插在影片 HTML 的 `</head>` 前面，所以能蓋過專案自己的樣式；`<html>` 會加上 `data-theme="dark"`（名稱去掉 `theme-`）。
- **所有選擇器都要掛在 `html[data-theme="<名稱>"]` 底下**，不能影響其他主題。
- 錄影型舞台的顏色一律用下面這組**主題變數**，主題要把它們全部重新定義：

  | 變數 | 用途 |
  |------|------|
  | `--bg` | 舞台底色 |
  | `--panel` | 網站視窗外框底色 |
  | `--line` | 框線 |
  | `--fg` | 主要文字 |
  | `--muted` | 次要文字 |
  | `--accent` | 步驟編號、片尾字卡 |
  | `--sub-bg` / `--sub-fg` | 字幕框底色／字色 |

- 動畫型的 `engine/effects.css` 元件（`.bg-*`、`.bubble`、`.card`、`.board`、`.sub`、`.end`…）要逐一覆蓋，參考 `plugins/theme-dark/theme.css`。
- 寫在元素 `style="…"` 裡的顏色蓋不掉，所以影片裡的顏色盡量用 class。

### tts：旁白聲音

```js
export default {
  name: 'tts-xxx', type: 'tts', apiVersion: 1, description: '…',
  platforms: ['darwin'], //               選填
  install: '怎麼安裝（doctor 會顯示）',
  available: () => true, //               這台電腦能不能用（要快、不能丟錯）
  synth(text, outBase, { speed }) { //    同步執行；speed 1＝正常、1.2＝快 20%
    // 把 text 念成音檔，檔名用 outBase 加上自己的副檔名，回傳完整路徑
    return `${outBase}.wav`
  },
}
```

- 回傳的檔案要是 ffmpeg 讀得到的音檔（aiff / wav / mp3 都可以）。
- `voice.js` 會量音檔長度，念不完就用更大的 `speed` 再呼叫一次，所以 `speed` 一定要有作用。

### character：角色

```js
export default { name: 'char-cat', type: 'character', apiVersion: 1, description: '…', script: 'cat.js', provides: ['cat'] }
```

- `script` 在瀏覽器執行，插在 `engine/characters.js` 後面，只能在 `window.Anim` 上加 `provides` 列出的函式。
- 形狀跟 `Anim.person` 一樣：`Anim.cat(設定) → (表情參數) => SVG 字串`，SVG 用 `viewBox="0 0 300 380"`，排版寬度才跟人物一致。
- 影片裡照常使用：`Anim.cast({ mimi: Anim.cat({ color: '#f59e0b' }) })`、`<div data-char="mimi:smile">`。

### step：錄影型的動作

```js
export default {
  name: 'step-basic', type: 'step', apiVersion: 1, description: '…',
  steps: {
    async highlight(ctx, page, locator, ms = 1500) { /* … */ },
  },
}
```

- 分幕裡用 `ctx.highlight(page, locator)` 呼叫（第一個參數 `ctx` 由引擎自動帶入）。
- 名稱不能跟內建動作（`narrate`、`tap`、`type`、`wait`、`S`、`file`…）或其他 step 插件撞名，撞名會報錯。
- 只能疊視覺效果（框線、游標、放大鏡），**不能改網站的資料**。

### hook：在某個時間點多做一件事

```js
export default {
  name: 'hook-xxx', type: 'hook', apiVersion: 1, description: '…',
  hooks: {
    async beforeScene(ctx, scene) {}, //          錄某一幕之前（prepare 之後）
    async afterScene(ctx, scene, meta) {}, //     某一幕錄完
    async afterRecord({ dir, out, theme, scenes }) {}, // 錄影型整支接好
    async afterRender({ dir, out, theme }) {}, //  動畫型輸出完
  },
}
```

只能用上面四個名稱，打錯字會報錯。

## 新增一個插件的步驟

1. 建 `plugins/<名稱>/index.mjs`（＋要用的 css / js）。
2. 在 `studio.config.mjs`（或某支影片的 `studio.config.mjs`）加一行路徑。
3. `npm run doctor`：會載入並檢查全部插件，不合規範會直接說哪個檔、哪一條。
4. 動畫型用 `npm run shots -- projects/<參考範例> --shots …`、錄影型用 `npm run record -- projects/<名稱> --scene 1` 看效果。
5. 更新 README「插件與主題」那張表。
