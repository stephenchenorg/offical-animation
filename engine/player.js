// 播放器：讀每個元素的 data-show="開始秒,結束秒"，依目前秒數加上或拿掉 .on
// 總長度寫在舞台上：<div class="stage" id="stage" data-total="30">
// 網址參數：?t=12 定格在第 12 秒、?record 隱藏提示與進度條（錄影用）
;(function () {
  window.Anim.drawAll()

  const stage = document.getElementById('stage')
  const TOTAL = Number(stage.dataset.total)
  const FADE = 0.45
  window.ANIM_TOTAL = TOTAL

  const nodes = [...document.querySelectorAll('[data-show]')].map((el) => {
    const [a, b] = el.dataset.show.split(',').map(Number)
    return { el, a, b }
  })
  const progress = document.getElementById('progress')
  const params = new URLSearchParams(location.search)
  if (params.has('record')) document.body.classList.add('record')

  // 即時播放
  let start = 0
  function render(t) {
    for (const n of nodes) n.el.classList.toggle('on', t >= n.a && t < n.b)
    if (progress) progress.style.width = `${Math.min(t / TOTAL, 1) * 100}%`
  }
  function tick(now) {
    const t = (now - start) / 1000
    render(t)
    if (t < TOTAL) requestAnimationFrame(tick)
  }
  function play() {
    document.body.classList.remove('seeking')
    nodes.forEach((n) => { n.el.classList.remove('on'); n.el.style.opacity = '' })
    requestAnimationFrame((now) => { start = now; requestAnimationFrame(tick) })
  }

  // 逐格定格（render.js 錄 MP4 用）：把所有動畫停在第 t 秒
  const clamp = v => Math.max(0, Math.min(1, v))
  window.seek = (t) => {
    document.body.classList.add('seeking')
    for (const n of nodes) {
      n.el.classList.toggle('on', t >= n.a && t < n.b)
      n.el.style.opacity = t < n.a ? 0 : t < n.b ? clamp((t - n.a) / FADE) : clamp(1 - (t - n.b) / FADE)
    }
    for (const anim of document.getAnimations()) {
      const el = anim.effect.target.closest('[data-show]')
      // 已暫停的 CSS 動畫在 class 拿掉後不會自動消失，要手動取消
      if (!el || !el.classList.contains('on')) { anim.cancel(); continue }
      const a = nodes.find(n => n.el === el).a
      anim.pause()
      anim.currentTime = Math.max(0, (t - a) * 1000)
    }
    if (progress) progress.style.width = `${Math.min(t / TOTAL, 1) * 100}%`
  }

  // 依視窗等比縮放 1080×1920 舞台
  function fit() {
    const s = Math.min(innerWidth / stage.offsetWidth, innerHeight / stage.offsetHeight)
    stage.style.transform = `scale(${s})`
  }
  addEventListener('resize', fit)
  fit()

  stage.addEventListener('click', play)
  addEventListener('keydown', (e) => { if (e.key === 'r' || e.key === 'R') play() })
  if (params.has('t')) window.seek(Number(params.get('t')))
  else setTimeout(play, 400)
})()
