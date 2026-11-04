# 說明動畫工具（offical-animation）

把「客戶遇到什麼問題 → 我們怎麼解決」拍成 30 秒左右的動畫短片，輸出成 MP4，可以用 LINE 傳、放進提案或上傳 Shorts／Reels。

## 這是什麼

可以把它想成一齣**舞台劇加上打燈師**：

- 所有角色和道具一開始就站在舞台上，只是燈是暗的；
- 打燈師照著時間表開燈、關燈：「第 0.6 秒照亮訊息泡泡、第 5 秒換第 2 幕」；
- 觀眾看起來是東西一個個出現，其實只是燈在開關。

做一支新影片，只要寫兩樣東西：

1. **腳本**（`腳本.md`）：每一幕演什麼、說什麼台詞、幾秒。
2. **舞台**（`index.html`）：照著腳本把角色和字卡擺上去，寫好每個東西幾秒出現。

角色的畫法、動畫效果、輸出 MP4 的程式都已經做好，放在 `engine/`，每支影片共用。

### 兩個原則（做任何決定前先想這兩條）

1. **影片是拿來讓客人看懂的，不是拿來玩的。** 每一幕都要回答「客人看完知道了什麼」。炫的特效、粒子、轉場，只要沒有幫客人看懂，就不做。
2. **盡量只花一點點 token。** 影片用「腳本＋HTML＋分幕檔」組出來，改一句字幕就是改一行，改一幕就只讀那一幕的檔、只重錄那一幕。不整支重讀、不整支重錄。這也是用 HTML 不用 canvas 的原因：canvas 改一個字要讀懂整段繪圖程式，花的 token 多好幾倍。

> 為什麼不用 AI 生影片？AI 影片一次只能生幾秒、角色每段都會換臉、中文字常變亂碼。這套做法的角色從頭到尾都一樣，中文字一定正確，秒數也很精準。代價是畫風只有扁平插畫。

## 這個 repo 存的是「做影片的方法」，不是影片

repo 裡**沒有任何影片，也沒有任何客戶專案**，只有做影片用的工具。影片成品和客戶的腳本都只留在做影片的那台電腦上。這套工具真正的價值在下面兩件事：

### 1. 共用元件的邏輯：做一次，每支影片都能用

就像劇團的固定班底和道具間：角色、動畫效果、輸出影片的程式都只寫一次，每支新影片直接拿來用，不用從頭畫。

| 共用的東西 | 放在哪 | 誰在用 |
|------|------|------|
| 角色、動畫效果、時間軸播放器 | `engine/`（`characters.js`、`effects.css`、`player.js`） | 所有動畫型影片 |
| 輸出 MP4、抽格檢查、念旁白 | `render.js`、`voice.js` | 所有影片 |
| 開新影片的空白範本 | `projects/_template/` | `npm run new` 複製出來的每支新影片 |
| 同一系列的共用版面、班底（本機） | `projects/<客戶>/_共用/` | 同一個客戶的整個系列 |

改一次共用元件，之後每支影片都跟著變好。例如修一下角色的畫法，下次重出時所有用到這個角色的影片都會更新。

### 2. 可以只改某一段，再重新產生整支

影片是用「腳本＋程式」組出來的，不是剪好就定死的檔案。客戶說「第 3 幕那句話要改」或「這個數字錯了」的時候，不用整支重做：

1. 改 `腳本.md` 裡那一幕，再把 `index.html`（錄影型是 `record.mjs`／`劇本.mjs`）對應的那段改掉；
2. 只抽那一段檢查：`npm run shots -- projects/<名稱> --shots <那幕的秒數>`；
3. 重新產生：`npm run render` → `npm run voice`，旁白會跟著新字幕一起更新。

錄影型影片是**一幕一個檔、一幕一段快取**，只重錄改過的幕，其他段直接接起來（見下方「錄影型影片」）。

> 所以 `腳本.md`、`index.html`、`record.mjs` 才是「原檔」，mp4 只是輸出結果。少了 mp4 還能重新產生；少了原檔就只能整支重做。

## 做一支新影片

```bash
cd offical-animation
npm install                       # 第一次用才需要
npm run new -- 某客戶-形象介紹        # 1. 從範本開一支新影片 → projects/某客戶-形象介紹/
#                                   2. 寫 projects/某客戶-形象介紹/腳本.md
#                                   3. 照腳本改 projects/某客戶-形象介紹/index.html
open projects/某客戶-形象介紹/index.html   # 4. 用瀏覽器預覽（點畫面或按 R 重播）
npm run shots -- projects/某客戶-形象介紹 --shots 3,8,12   # 5. 抽幾個時間點拼成一張圖檢查排版
npm run render -- projects/某客戶-形象介紹                 # 6. 輸出 projects/某客戶-形象介紹/output.mp4
npm run voice -- projects/某客戶-形象介紹                  # 7.（選用）加旁白 → 某客戶-形象介紹.mp4
```

需要先裝 ffmpeg：`brew install ffmpeg`。

實際上第 2～6 步通常交給 Claude：跟它說「用 offical-animation 幫 OO 客戶做一支說明動畫」，再貼上要講的內容就好。規則寫在 `CLAUDE.md`。

## 客戶影片放哪

`projects/` 底下除了 `_template/`（空白範本，3 幕 14 秒，`npm run new` 會複製這個）以外，**全部只留在本機，不進 git**：客戶的腳本、`index.html`、錄影程式、各系列的 `_共用/` 都屬於客戶專案內容。本機的影片清單在 `projects/影片清單.md`。

## 有哪些零件可以用

### 角色（`engine/characters.js`）

在 `index.html` 裡登記角色，再用 `data-char="名字:表情"` 擺上舞台：

```js
Anim.cast({
  peggy: Anim.person({ hair: 'long', outfit: 'blazer', color: '#1F3B73', glasses: true, item: 'phone' }),
  robot: Anim.robot,
})
```

| 設定 | 可選值 |
|------|------|
| `hair` 髮型 | `long` 及肩長髮、`bob` 短鮑伯、`short` 短髮、`spiky` 刺蝟頭、`bald` 光頭 |
| `hairColor` 髮色 | 任何色碼，預設黑色 |
| `skin` 膚色 | 任何色碼 |
| `outfit` 服裝 | `blazer` 西裝外套、`suit` 西裝領帶、`hoodie` 帽 T、`tshirt` T 恤 |
| `color` 服裝顏色 | 任何色碼 |
| `glasses` 眼鏡 | `true` / `false` |
| `item` 道具 | `phone` 手機、`folder` 文件夾、`laptop` 筆電、`none` |
| `mood` 預設表情 | `neutral` 平常、`smile` 微笑、`frown` 皺眉、`flat` 面無表情 |

AI 機器人：`robot:dim`（沒精神）、`robot:happy`（開心）、`robot:full`（肚子裝滿資料）。

### 效果（`engine/effects.css`）

| 類別 | 效果 |
|------|------|
| `up` / `pop` / `walk-in` | 往上浮出／彈出／從右邊走進來 |
| `shake` / `nod-no` | 左右晃（鎖頭）／搖頭（`style="--delay:2s"` 控制幾秒後搖） |
| `draw` | SVG 線條像用筆畫出來（白板） |
| `bar` / `bar-x` | 長條往上長／往右長 |
| `spin` | 時鐘指針一直轉 |
| `bubble` | 訊息泡泡往上飄走 |
| `cloud` | 頭上的烏雲 |
| `card bad` / `card good` | 紅色 ❌ 字卡／綠色 ✅ 字卡 |
| `tag` | 段落標題膠囊，例如「做法一｜匯出同步」 |
| `doc` / `hour` / `cube` / `lang` / `glow` | 滑動的文件／「+1 工時」標籤／飛進去的資料方塊／彩色多語泡泡／光暈 |
| `board` / `board-dim` | 白板／白板淡化（讓字卡疊上去） |
| `sub` | 中下方大字幕，`<b>` 放說話者；`sub vendor` 灰、`sub eng` 綠 |
| `end` | 片尾字卡 |
| `bg-blue` / `bg-grey` / `bg-slate` / `bg-green` / `bg-bright` | 場景背景：目標／卡關／比較／解方／結尾 |

### 時間軸

每個元素加 `data-show="開始秒,結束秒"`。同一個角色要換表情，就疊兩個元素、各給一段時間，例如：

```html
<div class="abs" data-show="5,9.6"  style="left:90px;top:800px;width:330px" data-char="peggy:neutral"></div>
<div class="abs" data-show="9.6,11" style="left:90px;top:800px;width:330px" data-char="peggy:frown"></div>
```

## 旁白（`voice.js`）

`npm run voice -- projects/<名稱>` 會把 `index.html` 裡每一句字幕（`.sub`）念成語音，放在字幕出現的時間點，合進 `output.mp4` 存成跟資料夾同名的 `<名稱>.mp4`（例如 `projects/濂達/不卡控說明/不卡控說明.mp4`，取最後一層資料夾名；已存在就覆寫）。字幕框上的說話者（`<b>`）不念。

- 一句念不完時會自動加快語速（最快 ×1.37），還是念不完就印出警告，這時把字幕時間拉長。
- 念法跟字幕不一樣（數字、編號、英文縮寫）時，在那個字幕元素加 `data-say="要念的字"`，例如 `data-say="例如零二四七、零六一五五"`。
- 聲音來自**語音插件**（`studio.config.mjs`）：Mac 用 `tts-say`（美佳）、Windows 用 `tts-windows`（內建中文語音）、Docker 用 `tts-edge`（微軟線上語音）。`--tts edge` 指定、`--speed 1.1` 改基本語速（舊的 `--rate 190` 也還能用）。

## 錄影型影片（真實網站分幕錄影）

### 為什麼要分幕

想像拍一支 demo：後台首頁、新增訂單、報表三段。拍完一週後，客戶把**首頁（Dashboard）改版了**。

- 以前：整支片是一個程式從頭錄到尾，只能整支重錄，連沒改的報表那段也要重錄。
- 現在：每一幕是一個獨立的檔案、錄成獨立的一小段影片放在快取。首頁改版 → 只重錄「畫面裡有出現首頁」的那幾幕，其他幕直接拿快取接起來。

但「哪幾幕有出現首頁」不一定只有第 1 幕。例如「新增訂單」最後會回首頁看數字變多，所以它也跟首頁有關。這種**關聯**寫在每一幕的 `pages` 欄位裡，系統哪一頁改了，一個指令就找得出所有要重錄的幕。

### 專案長相（`npm run new -- <名稱> --錄影`，複製自 `projects/_template-錄影`）

```
video.config.mjs     目錄：舞台尺寸、網站視窗位置、頁面清單（pages）、分幕順序（scenes）
index.html           舞台：步驟標題、網站視窗外框、字幕（window.S.sub / step / end / reset）
scenes/01-總覽.mjs    一幕一個檔：{ title, pages: ['dashboard'], prepare(), run() }
腳本.md               分幕跟 scenes/ 一一對應，每幕多一行「頁面」
.cache/scenes/        每幕錄好的小段（不進 git；淺色、深色分開放）
```

### 常用指令

| 情境 | 指令 |
|------|------|
| 看每一幕的狀態（已錄／程式有改／還沒錄） | `npm run record -- projects/<名稱> --list` |
| 改了某幾幕的程式，只重錄那幾幕 | `npm run record -- projects/<名稱>`（自動挑出有改的） |
| 系統的 Dashboard 改版了，先看會影響哪幾幕 | `npm run record -- projects/<名稱> --page dashboard --dry` |
| 確認後重錄那幾幕 | `npm run record -- projects/<名稱> --page dashboard` |
| 指定重錄第 2、5 幕 | `npm run record -- projects/<名稱> --scene 2,5` |
| 整支重錄 | `npm run record -- projects/<名稱> --all` |
| 深色版 | 加 `--theme dark` → `output-dark.mp4` |

**增刪改幕（CRUD）**：新增＝在 `scenes/` 加檔案＋在 `video.config.mjs` 的 `scenes` 加一行；刪除＝拿掉那一行（快取會自動清）；調順序＝換行的順序（**不用重錄**，直接重接）；修改＝改那個檔（自動判斷要重錄）。

### 寫分幕的規則

- **每一幕都要能單獨重錄**：需要的資料、登入狀態、停在哪一頁，寫在 `prepare()`（不錄影），不能靠上一幕留下的狀態。
- `pages` 照實寫畫面裡出現過的系統頁面，漏寫就會在改版時漏重錄。
- `ctx` 有：`narrate(字幕, 念法?)`、`tap(page, locator)`、`type(page, locator, 文字)`、`wait(ms)`、`S('step', n, 標題)`、`win.<視窗名>`、`file('相對路徑')`，以及 step 插件加的動作（如 `highlight`）。
- 不要把正式資料、真實客人個資錄進去；送出類動作用 `page.route` 攔截回假結果，不寫進任何資料庫。
- 舊的錄影型專案（自己帶 `record.mjs` 的，如小黑貓、一定發）照舊用 `node projects/<名稱>/record.mjs` 錄；要改成分幕，就照範本把各幕拆到 `scenes/`。

## 插件與主題

全站要載入哪些插件寫在根目錄的 `studio.config.mjs`；單一支影片要不同設定，在專案資料夾放同名檔案覆蓋。插件分五種：

| 種類 | 做什麼 | 內建 |
|------|--------|------|
| theme | 換整支片的配色 | `theme-dark`（深色） |
| tts | 旁白聲音 | `tts-say`、`tts-windows`、`tts-edge` |
| character | 新角色 | `char-cat`（範例：一隻貓） |
| step | 錄影型分幕裡可以用的動作 | `step-basic`（highlight、scrollTo） |
| hook | 在錄完／輸出完時多做一件事 | （無，寫法見 PLUGINS.md） |

深色版：`npm run render -- projects/<名稱> --theme dark`（動畫型）或 `npm run record -- projects/<名稱> --theme dark`（錄影型），接著 `npm run voice -- projects/<名稱> --theme dark`。插件怎麼寫、規範有哪些 → **[PLUGINS.md](PLUGINS.md)**。

## Windows 與 Docker

- 先跑 `npm run doctor`：會列出這台電腦缺什麼、怎麼裝（Mac、Windows、Linux 都適用）。
- **Windows**：`winget install OpenJS.NodeJS.LTS Gyan.FFmpeg` → `npm install` → `npx playwright install chromium`。旁白自動改用 Windows 內建中文語音（設定 → 時間與語言 → 語音 → 新增「中文(台灣)」）；想要更自然的聲音就 `pip install edge-tts`，加 `--tts edge`。
- **Docker**（什麼都不用裝）：`npm run docker:build` 一次，之後
  `docker run --rm -v "$PWD/projects:/app/projects" offical-animation render projects/<名稱> --theme dark`
  （指令換成 `record`、`voice`、`doctor` 都可以；Windows PowerShell 用 `"${PWD}\projects"`）。Docker 裡的旁白用 `tts-edge`，需要網路。

## 目前不支援

- **配樂**：沒有背景音樂。要的話把有聲成品（`<資料夾名>.mp4`）丟進剪映再加。
- **旁白音色**：內建語音偏機器。要更自然的人聲，用 `tts-edge`，或丟進剪映用 AI 配音。
- **複雜動作**：例如走路時腿會動、手勢，這類只能用簡單位移代替。
