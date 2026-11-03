# offical-animation：給 Claude 的工作規則

用 HTML 做客戶說明動畫並輸出 MP4。完整說明見 `README.md`。

## 流程（每支影片都一樣）

1. `npm run new -- <客戶-主題>` 開新資料夾，資料夾用中文命名，格式「客戶-主題」（例：`npm run new -- 某客戶-形象介紹`）。
2. **先寫 `腳本.md`**，格式照 `projects/_template/腳本.md`：每幕都要有「幕名＋時間區間」「畫面」「旁白或台詞」「字卡」。腳本給使用者確認後才做 `index.html`。
3. 照腳本改 `index.html`。**先看參考範例**（本機 `CLAUDE.local.md` 有寫是哪一支），版面、座標、時間的寫法照它來。
4. 檢查：`node render.js projects/<名稱> --shots <每幕挑 1～2 個時間點>`，Read `shots.png`，看字有沒有超框、角色有沒有被字卡或字幕擋住。有問題修完再抽一次。
5. 使用者確認後 `node render.js projects/<名稱>` 輸出 `output.mp4`。
6. **一律加旁白**（使用者 2026-10-27 指示，每支都要念出來）：接著跑 `node voice.js projects/<名稱>` 產生 `output-voice.mp4`，`open` 給使用者看的是這支有聲版。寫字幕時就先把數字、編號、英文縮寫的念法用 `data-say` 寫好；看 voice.js 的輸出，有 ⚠️ 念不完的就把字幕時間拉長再重跑。
7. **客戶專案不進 git**：`projects/` 底下除了 `_template/` 全部列在 `.gitignore`，影片成品（`*.mp4`）、`shots.png` 也是。git 只追蹤工具本身（`engine/`、`render.js`、`voice.js`、`new.js`、`_template/`、README）。

改動已經做好的影片時，`腳本.md` 和 `index.html` 要一起改，兩邊不能不一致。

## 錄影型專案（真實網站＋示意畫面）

要錄真實系統畫面時，不走 `render.js`，改成專案自己的 `record.mjs`（做法見 README「錄影型影片」）。腳本、旁白、commit 規則一樣；檢查畫面用 ffmpeg 從 `output.mp4` 抽格拼圖，不用 `--shots`。

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
