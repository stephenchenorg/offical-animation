export default {
  title: '新增一筆訂單',
  pages: ['orders', 'dashboard'], // 最後會回到 dashboard 看數字變化，所以 dashboard 改版也要重錄這幕
  async prepare({ win, file }) {
    await win.site.goto(file('demo/site.html#orders'))
    await win.site.evaluate(() => localStorage.clear())
    await win.site.reload()
  },
  async run(ctx) {
    const { S, win, narrate, tap, type, wait } = ctx
    const p = win.site
    await S('step', 2, '新增訂單')
    await narrate('接到新訂單，按「新增訂單」。')
    await tap(p, p.getByRole('button', { name: '新增訂單' }))
    await type(p, p.getByLabel('客戶名稱'), '王小明')
    await type(p, p.getByLabel('金額'), '1200')
    await narrate('填好客戶和金額，按送出。')
    await tap(p, p.getByRole('button', { name: '送出' }))
    await wait(600)
    await tap(p, p.getByRole('link', { name: '首頁' }))
    await narrate('回到首頁，今日訂單馬上多一筆。')
  },
}
