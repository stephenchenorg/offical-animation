// 一幕一個檔。規則：
//   pages    這幕畫面裡出現哪些系統頁面（要在 video.config.mjs 的 pages 登記）→ 那頁改版時會被挑出來重錄
//   prepare  不錄影：把這幕需要的資料／頁面狀態準備好。每一幕都要能「單獨」重錄，不能靠上一幕留下的狀態
//   run      錄影：ctx.narrate 念字幕、ctx.tap 點、ctx.type 打字、ctx.S('step', …) 換舞台標題
export default {
  title: '後台首頁總覽',
  pages: ['dashboard'],
  async prepare({ win, file }) {
    await win.site.goto(file('demo/site.html#dashboard'))
    await win.site.evaluate(() => localStorage.clear())
    await win.site.reload()
  },
  async run(ctx) {
    const { S, win, narrate, highlight } = ctx
    await S('step', 1, '後台首頁')
    await narrate('登入後台，首頁就看得到今天的訂單數和營收。')
    await highlight(win.site, win.site.locator('#card-orders'))
    await narrate('數字會即時更新，不用自己去算。')
  },
}
