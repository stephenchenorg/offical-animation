// 錄影型影片的「目錄」：看這一個檔就知道整支片有哪幾幕、每幕碰到系統哪些頁面。
// 改版時：系統哪一頁改了 → node record.mjs projects/<名稱> --page <頁面> --dry 先看會重錄哪幾幕
export default {
  size: { width: 1920, height: 1080 },
  stage: 'index.html',

  // 影片會錄到的系統頁面（名稱自己取，給分幕的 pages 引用）。
  // 這張表就是「關聯性」：Dashboard 改版 → 所有 pages 有 dashboard 的幕都要重錄
  pages: {
    dashboard: '後台首頁（今日訂單數、營收卡片）',
    orders: '訂單列表＋新增訂單表單',
    report: '營收報表',
  },

  // 要錄的網站視窗：各是一個獨立瀏覽器（各自登入），錄完疊到舞台的 x, y
  //   手機：{ x, y, width: 390, height: 844, scale: 2, device: 'iPhone 13' }
  windows: {
    site: { x: 600, y: 150, width: 1240, height: 700 },
  },

  // 整支只跑一次、不錄：登入、關公告……（每次重錄都會跑，所以要能重複執行）
  async setup(ctx) {
    await ctx.win.site.goto(ctx.file('demo/site.html#dashboard'))
  },

  // 分幕順序。新增＝加檔案＋加一行；刪除＝拿掉這行；調順序＝換行的順序（不用重錄）
  scenes: [
    'scenes/01-總覽.mjs',
    'scenes/02-新增訂單.mjs',
    'scenes/03-報表.mjs',
  ],
}
