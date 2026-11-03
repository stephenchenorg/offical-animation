// 動作插件：錄影型影片的分幕裡用 ctx.<動作>(...) 呼叫
export default {
  name: 'step-basic',
  type: 'step',
  apiVersion: 1,
  description: '常用動作：highlight 框出重點、scrollTo 平順捲到元素',
  steps: {
    // 在真實網站上框出一個元素 ms 毫秒（不改網站資料，只疊一個框）
    async highlight(ctx, page, locator, ms = 1500) {
      const b = await locator.boundingBox()
      if (!b) return
      await page.evaluate(({ x, y, w, h, ms }) => {
        const d = document.createElement('div')
        d.style.cssText = `position:fixed;left:${x - 6}px;top:${y - 6}px;width:${w + 12}px;height:${h + 12}px;
          border:4px solid #f59e0b;border-radius:10px;box-shadow:0 0 0 9999px rgba(0,0,0,.25);
          z-index:2147483647;pointer-events:none;transition:opacity .3s`
        document.documentElement.appendChild(d)
        setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 300) }, ms)
      }, { x: b.x, y: b.y, w: b.width, h: b.height, ms })
      await ctx.wait(ms + 300)
    },
    async scrollTo(ctx, page, locator) {
      await locator.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      await ctx.wait(700)
    },
  },
}
