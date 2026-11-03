// 角色庫：用 person() 組出角色，同一支影片每一幕都用同一組設定，長相就不會跑掉
// 用法（在專案的 index.html 裡）：
//   Anim.cast({
//     peggy: Anim.person({ hair: 'long', outfit: 'blazer', color: '#1F3B73', glasses: true, item: 'phone' }),
//     robot: Anim.robot,
//   })
//   <div data-char="peggy:smile"></div>   ← 角色名:表情
;(function () {
  // 把顏色調亮或調暗（amount 負數＝變暗），用來算衣領、帽子這類陰影色
  function shade(hex, amount) {
    const n = Number.parseInt(hex.slice(1), 16)
    const f = c => Math.max(0, Math.min(255, Math.round(c * (1 + amount))))
    const r = f(n >> 16)
    const g = f((n >> 8) & 255)
    const b = f(n & 255)
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
  }

  // 表情：嘴型 + 眉毛
  const MOUTHS = {
    neutral: 'M134 182 Q150 188 166 182',
    smile: 'M128 176 Q150 202 172 176',
    frown: 'M136 190 Q150 178 164 190',
    flat: 'M136 184 H164',
  }
  const BROWS = {
    neutral: c => `<path d="M106 112 h32 M162 112 h32" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`,
    flat: c => `<path d="M108 114 h30 M162 114 h30" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`,
    smile: c => `<path d="M106 112 q16-8 32 0 M162 112 q16-8 32 0" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`,
    frown: c => `<path d="M106 106 l32 10 M194 106 l-32 10" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`,
  }

  // 髮型：back 畫在臉後面（長髮），front 畫在臉上面（瀏海）
  const HAIRS = {
    long: {
      back: 'M72 140 Q70 52 150 52 Q230 52 228 140 L238 258 Q150 278 62 258 Z',
      front: 'M86 134 Q88 62 150 64 Q214 62 214 134 Q194 94 150 98 Q116 96 86 134 Z',
    },
    bob: {
      back: 'M74 140 Q72 54 150 54 Q228 54 226 140 L230 210 Q150 226 70 210 Z',
      front: 'M86 134 Q88 62 150 64 Q214 62 214 134 Q194 94 150 98 Q116 96 86 134 Z',
    },
    short: {
      front: 'M88 126 Q92 60 150 60 Q208 60 212 126 Q200 88 150 88 Q100 88 88 126 Z',
    },
    spiky: {
      front: 'M86 128 L92 72 L116 86 L130 56 L150 80 L172 54 L188 84 L210 70 L214 128 Q192 96 150 100 Q108 96 86 128 Z',
    },
    bald: {},
  }

  // 服裝：上半身
  const BODY = 'M40 520 L56 292 Q62 238 150 232 Q238 238 244 292 L260 520 Z'
  const OUTFITS = {
    blazer: c => `
      <path d="${BODY}" fill="${c}"/>
      <path d="M120 236 L150 330 L180 236 Z" fill="#fff"/>
      <path d="M120 236 L150 330 L134 342 L104 250 Z M180 236 L150 330 L166 342 L196 250 Z" fill="${shade(c, -0.25)}"/>`,
    suit: c => `
      <path d="${BODY}" fill="${c}"/>
      <path d="M122 236 L150 320 L178 236 Z" fill="#fff"/>
      <path d="M144 244 L156 244 L162 320 L150 340 L138 320 Z" fill="#374151"/>
      <path d="M122 236 L150 320 L136 332 L106 250 Z M178 236 L150 320 L164 332 L194 250 Z" fill="${shade(c, -0.25)}"/>`,
    hoodie: c => `
      <path d="${BODY}" fill="${c}"/>
      <path d="M86 246 Q150 306 214 246 Q212 218 150 216 Q88 218 86 246 Z" fill="${shade(c, -0.2)}"/>
      <path d="M134 270 v50 M166 270 v50" stroke="#e5e7eb" stroke-width="6" stroke-linecap="round"/>`,
    tshirt: c => `
      <path d="${BODY}" fill="${c}"/>
      <path d="M124 234 Q150 262 176 234" fill="none" stroke="${shade(c, -0.25)}" stroke-width="8"/>`,
  }

  // 手上的道具
  const ITEMS = {
    phone: skin => `
      <rect x="196" y="300" width="56" height="96" rx="10" fill="#111827"/>
      <rect x="202" y="308" width="44" height="76" rx="6" fill="#60a5fa"/>
      <ellipse cx="216" cy="404" rx="26" ry="20" fill="${skin}"/>`,
    folder: () => `
      <rect x="168" y="318" width="112" height="150" rx="8" fill="#C08A4A" transform="rotate(-8 224 393)"/>
      <rect x="178" y="330" width="92" height="12" rx="4" fill="#e7c9a2" transform="rotate(-8 224 393)"/>`,
    laptop: () => `
      <rect x="70" y="350" width="170" height="112" rx="10" fill="#CBD5E1"/>
      <circle cx="155" cy="406" r="10" fill="#f8fafc"/>`,
    none: () => '',
  }

  // 組出一個人物角色，回傳「表情 → SVG」的函式
  function person({
    hair = 'short',
    hairColor = '#1b1b1f',
    skin = '#F3CBA5',
    outfit = 'blazer',
    color = '#1F3B73',
    glasses = false,
    item = 'none',
    mood: defaultMood = 'neutral',
  } = {}) {
    const h = HAIRS[hair]
    return (mood = defaultMood) => `
      <svg viewBox="0 0 300 520" width="100%">
        ${h.back ? `<path d="${h.back}" fill="${hairColor}"/>` : ''}
        <rect x="128" y="196" width="44" height="40" fill="${shade(skin, -0.06)}"/>
        ${OUTFITS[outfit](color)}
        <ellipse cx="150" cy="138" rx="62" ry="72" fill="${skin}"/>
        ${h.front ? `<path d="${h.front}" fill="${hairColor}"/>` : ''}
        ${BROWS[mood](hairColor)}
        <circle cx="124" cy="142" r="5" fill="#222"/><circle cx="176" cy="142" r="5" fill="#222"/>
        ${glasses ? '<g fill="none" stroke="#2b2b2b" stroke-width="4"><circle cx="124" cy="142" r="20"/><circle cx="176" cy="142" r="20"/><path d="M144 142 h12"/></g>' : ''}
        ${mood === 'smile' ? '<circle cx="104" cy="170" r="10" fill="#f9a8a8" opacity=".6"/><circle cx="196" cy="170" r="10" fill="#f9a8a8" opacity=".6"/>' : ''}
        <path d="${MOUTHS[mood]}" fill="none" stroke="#9f1239" stroke-width="6" stroke-linecap="round"/>
        ${ITEMS[item](skin)}
      </svg>`
  }

  // AI 機器人：dim＝沒精神、happy＝開心但肚子空、full＝開心且肚子裝滿資料
  function robot(state = 'dim') {
    const happy = state !== 'dim'
    return `
      <svg viewBox="0 0 300 380" width="100%">
        <line x1="150" y1="50" x2="150" y2="18" stroke="#94a3b8" stroke-width="6"/>
        <circle cx="150" cy="16" r="12" fill="${happy ? '#34d399' : '#cbd5e1'}"/>
        <rect x="60" y="50" width="180" height="130" rx="52" fill="#fff" stroke="#cbd5e1" stroke-width="5"/>
        <rect x="84" y="80" width="132" height="74" rx="34" fill="#1e293b"/>
        ${happy
          ? '<path d="M110 124 q15-22 30 0 M160 124 q15-22 30 0" fill="none" stroke="#60a5fa" stroke-width="10" stroke-linecap="round"/>'
          : '<rect x="110" y="114" width="28" height="10" rx="5" fill="#60a5fa" opacity=".45"/><rect x="162" y="114" width="28" height="10" rx="5" fill="#60a5fa" opacity=".45"/>'}
        <ellipse cx="48" cy="270" rx="22" ry="44" fill="#fff" stroke="#cbd5e1" stroke-width="5" transform="rotate(${happy ? -30 : 10} 48 270)"/>
        <ellipse cx="252" cy="270" rx="22" ry="44" fill="#fff" stroke="#cbd5e1" stroke-width="5" transform="rotate(${happy ? 30 : -10} 252 270)"/>
        <circle cx="150" cy="276" r="92" fill="#fff" stroke="#cbd5e1" stroke-width="5"/>
        <circle cx="150" cy="276" r="58" fill="rgba(96,165,250,.10)" stroke="#93c5fd" stroke-width="5" stroke-dasharray="12 10"/>
        ${state === 'full'
          ? `<defs><radialGradient id="belly"><stop offset="0" stop-color="#a7f3d0"/><stop offset="1" stop-color="#3b82f6"/></radialGradient></defs>
            <circle cx="150" cy="276" r="58" fill="url(#belly)"/>
            <rect x="118" y="250" width="26" height="26" rx="6" fill="#fff" opacity=".9"/>
            <rect x="152" y="246" width="26" height="26" rx="6" fill="#fff" opacity=".9"/>
            <rect x="134" y="282" width="26" height="26" rx="6" fill="#fff" opacity=".9"/>`
          : ''}
      </svg>`
  }

  const roster = {}
  window.Anim = {
    person,
    robot,
    shade,
    cast(map) { Object.assign(roster, map) },
    // 把頁面上所有 data-char 元素畫成角色（player.js 會自動呼叫）
    drawAll() {
      document.querySelectorAll('[data-char]').forEach((el) => {
        const [name, arg] = el.dataset.char.split(':')
        if (!roster[name]) throw new Error(`找不到角色「${name}」，請先在 Anim.cast() 登記`)
        el.innerHTML = roster[name](arg)
      })
    },
  }
})()
