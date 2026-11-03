// 人物插件範例：加一隻貓 Anim.cat({ color })，用法跟 Anim.person 一樣
//   Anim.cast({ mimi: Anim.cat({ color: '#f59e0b' }) })  →  <div data-char="mimi:smile"></div>
export default {
  name: 'char-cat',
  type: 'character',
  apiVersion: 1,
  description: '範例角色：一隻貓（Anim.cat），表情 neutral / smile',
  script: 'cat.js',
  provides: ['cat'],
}
