// 在瀏覽器裡執行。規範：只在 window.Anim 上加 provides 列出的函式，不動其他東西。
// 形狀：Anim.<名稱>(opts) 回傳 (表情參數) => SVG 字串；viewBox 用 0 0 300 380，跟人物同尺寸才好排版。
;(function () {
  window.Anim.cat = ({ color = '#f59e0b' } = {}) => (mood = 'neutral') => {
    const dark = window.Anim.shade(color, -0.3)
    const mouth = mood === 'smile' ? 'M132 196 Q150 214 168 196' : 'M136 200 H164'
    return `
      <svg viewBox="0 0 300 380" width="100%">
        <path d="M70 360 Q60 250 150 240 Q240 250 230 360 Z" fill="${color}"/>
        <path d="M232 330 Q290 300 268 240" fill="none" stroke="${dark}" stroke-width="16" stroke-linecap="round"/>
        <path d="M82 120 L96 40 L140 96 Z M218 120 L204 40 L160 96 Z" fill="${dark}"/>
        <circle cx="150" cy="160" r="84" fill="${color}"/>
        <circle cx="120" cy="150" r="10" fill="#1e293b"/>
        <circle cx="180" cy="150" r="10" fill="#1e293b"/>
        <path d="M144 176 h12 l-6 8 z" fill="#f472b6"/>
        <path d="${mouth}" fill="none" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>
        <path d="M70 172 h40 M70 190 h40 M190 172 h40 M190 190 h40" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>
      </svg>`
  }
})()
