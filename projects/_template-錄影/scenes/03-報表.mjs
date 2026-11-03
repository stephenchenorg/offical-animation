export default {
  title: '營收報表',
  pages: ['report'],
  async prepare({ win, file }) {
    await win.site.goto(file('demo/site.html#dashboard'))
  },
  async run(ctx) {
    const { S, win, narrate, tap } = ctx
    const p = win.site
    await S('step', 3, '營收報表')
    await tap(p, p.getByRole('link', { name: '報表' }))
    await narrate('報表頁可以看每天的營收走勢。')
    await S('end', '訂單、營收，一個後台全部搞定')
    await narrate('以上就是後台的主要功能。')
  },
}
