# offical-animation：給 Claude 的工作規則

用 HTML 做客戶說明動畫並輸出 MP4。完整說明見 `README.md`。

## 兩個原則（使用者 2026-11-03 指示，所有決定以這兩條為準）

1. **影片的目的是讓客人看懂，不是拿來玩的。** 不加沒有幫助理解的特效、粒子、花俏轉場；使用者沒要求就不提議這類東西。
2. **盡量只花一點點 token。** 只讀要改的那一幕／那一段，指令輸出接 `| tail`，不整支重讀、不整支重錄。維持用 HTML＋CSS（不要改成 canvas）：改一行就能改字幕、換主題，最省 token。

## 流程（每支影片都一樣）

1. `npm run new -- <客戶-主題>` 開新資料夾，資料夾用中文命名，格式「客戶-主題」（例：`npm run new -- 某客戶-形象介紹`）。
2. **先寫 `腳本.md`**，格式照 `projects/_template/腳本.md`：每幕都要有「幕名＋時間區間」「畫面」「旁白或台詞」「字卡」。腳本給使用者確認後才做 `index.html`。
3. 照腳本改 `index.html`。**先看參考範例**（本機 `CLAUDE.local.md` 有寫是哪一支），版面、座標、時間的寫法照它來。
4. 檢查：`node render.js projects/<名稱> --shots <每幕挑 1～2 個時間點>`，Read `shots.png`，看字有沒有超框、角色有沒有被字卡或字幕擋住。有問題修完再抽一次。
5. 使用者確認後 `node render.js projects/<名稱>` 輸出 `output.mp4`。
6. **一律加旁白**（使用者 2026-10-27 指示，每支都要念出來）：接著跑 `node voice.js projects/<名稱>`（聲音來自 tts 插件，Mac 預設美佳）產生 `output-voice.mp4`，`open` 給使用者看的是這支有聲版。寫字幕時就先把數字、編號、英文縮寫的念法用 `data-say` 寫好；看 voice.js 的輸出，有 ⚠️ 念不完的就把字幕時間拉長再重跑。
7. **客戶專案不進 git**：`projects/` 底下除了 `_template/`、`_template-錄影/` 全部列在 `.gitignore`，影片成品（`*.mp4`）、`shots.png` 也是。git 只追蹤工具本身（`engine/`、`plugins/`、`render.js`、`record.mjs`、`voice.js`、`new.js`、`doctor.mjs`、兩個 `_template*/`、README、PLUGINS.md、Dockerfile）。

改動已經做好的影片時，`腳本.md` 和 `index.html` 要一起改，兩邊不能不一致。

## 錄影型專案（真實網站分幕錄影）

**為什麼要分幕**：demo 的系統常常改版。某一頁改了，不能整支重錄，只能重錄跟那頁有關的幾幕。而且一頁可能牽動好幾幕（例：Dashboard 改了，「首頁總覽」「新增訂單後回首頁看數字」兩幕都要重錄）。所以每一幕是一個獨立檔案、獨立快取，關聯寫在每幕的 `pages`。

- 開新片：`npm run new -- <客戶-主題> --錄影`（複製 `projects/_template-錄影`），做法見 README「錄影型影片」。
- **改版時的固定流程**：使用者說「某某頁改了」→ `npm run record -- projects/<名稱> --page <頁面> --dry` 列出受影響的幕 → 給使用者看 → 確認後拿掉 `--dry` 重錄。不要整支 `--all` 重錄，除非使用者要求。
- 新增／刪除／調順序：只改 `video.config.mjs` 的 `scenes` 清單＋對應 scene 檔；調順序不用重錄。`腳本.md` 的分幕要跟著改。
- 每幕要能單獨重錄：需要的狀態寫在 `prepare()`，不能靠上一幕。`pages` 要照實寫，漏寫會在改版時漏錄。
- 檢查畫面：從 `.cache/scenes/<主題>/<幕>.mp4` 或 `output.mp4` 用 ffmpeg 抽格拼圖，不用 `--shots`。
- 舊的錄影型專案（自帶 `record.mjs`，如小黑貓、一定發）照舊；使用者要求才改成分幕。

## 省 token 的讀檔順序（錄影型）

**為什麼**：一支片十幾幕，整包讀進來很浪費，而且大多數修改只碰一兩幕。

1. 先跑 `npm run record -- projects/<名稱> --list`（一張表：每幕狀態、長度、頁面），不要先讀檔。
2. 要改哪一幕，只讀 `video.config.mjs`＋那一個 `scenes/NN-*.mjs`。舞台 `index.html` 和其他幕不用讀。
3. 錄影輸出只看最後幾行（`| tail -5`），不要讓整段錄影 log 進 context。

## 插件、深色版、Windows／Docker

- 插件（主題 theme、語音 tts、角色 character、動作 step、掛勾 hook）寫在 `plugins/`，用 `studio.config.mjs` 開關。規範見 `PLUGINS.md`，新增或改插件後跑 `npm run doctor` 檢查。
- 不要在 `render.js`／`voice.js`／`engine/recorder.mjs` 裡寫死某個平台的指令（例如 `say`）；平台相關的東西做成插件。
- 深色版：render／record／voice 都加 `--theme dark`，輸出 `output-dark.mp4`、`output-dark-voice.mp4`。使用者沒說要深色版就只做淺色。
- 路徑一律用 `path.join`，ffmpeg 清單用 `engine/media.mjs` 的 `concatPath`，Windows 才不會壞。

## 版面規則（9:16，1080×1920）

- 上方 290px 以內、下方 1536px 以下盡量不放重要內容（平台的標題、按讚按鈕會擋住）。
- 字幕固定在 `top:1330px`（`.sub`），一句最多兩行，每行 16 個字以內。
- 兩個角色同框時上下排或左右分開，不要重疊；角色寬度 250～340px。
- 字卡疊在白板上時，先放 `board-dim` 淡化白板內容。
- 旁白長度：每秒約 4～5 個字，字幕顯示時間不能比念完的時間短。

## 寫程式的規則

- 共用的角色、效果放 `engine/`；只有這支影片用得到的樣式寫在該專案 `index.html` 的 `<style>`。
- 新的效果或角色零件如果之後會重用，加進 `engine/`，並更新 `README.md` 的零件表。
- 改 `engine/` 之後，用 `--shots` 確認參考範例還是正常的。
- 改了字幕就要重跑 `voice.js`，旁白和字幕才會一致。
- 不要用 AI 影片生成工具；這套工具存在的理由就是角色一致、中文正確。

## 內容規則

- 客戶相關規則（具名與否、各系列做法）寫在本機的 `CLAUDE.local.md`，不進 git。
- 影片裡寫出真實廠商名稱時，提醒使用者這支片只適合對內看。
