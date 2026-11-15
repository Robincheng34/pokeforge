/** 属性徽章（官方配色）+ 效果/状态 emoji 映射 */
const TYPE_COLORS: Record<number, string> = {
  0: '#a8a878', 1: '#c03028', 2: '#a890f0', 3: '#a040a0', 4: '#e0c068',
  5: '#b8a038', 6: '#a8b820', 7: '#a8b820', 8: '#705898', 9: '#b8b8d0',
  10: '#68a090',
  0x14: '#f08030', 0x15: '#6890f0', 0x16: '#78c850', 0x17: '#f8d030',
  0x18: '#f85888', 0x19: '#98d8d8', 0x1a: '#7038f8', 0x1b: '#705848'
}

export function TypeBadge({ id, label }: { id: number; label: string }) {
  const color = TYPE_COLORS[id] ?? '#68a090'
  return (
    <span
      style={{
        background: color, color: '#fff', borderRadius: 4,
        padding: '1px 8px', fontSize: 11, fontWeight: 600,
        flexShrink: 0, textShadow: '0 1px 1px rgba(0,0,0,0.4)'
      }}
    >
      {label}
    </span>
  )
}

/** 按效果关键词给出 emoji 图标 */
export function effectEmoji(zh: string): string {
  if (/一击必杀/.test(zh)) return '💀'
  if (/毒/.test(zh)) return '☠️'
  if (/灼伤|火|燃烧/.test(zh)) return '🔥'
  if (/冰冻|冰/.test(zh)) return '❄️'
  if (/睡眠|梦/.test(zh)) return '💤'
  if (/麻痹|电/.test(zh)) return '⚡'
  if (/混乱/.test(zh)) return '💫'
  if (/回复|治疗|治愈|救/.test(zh)) return '💚'
  if (/降低|减半|下降/.test(zh)) return '⬇️'
  if (/提升|强化|上升/.test(zh)) return '⬆️'
  if (/威力|攻击|伤害|普通攻击/.test(zh)) return '⚔️'
  if (/捕捉/.test(zh)) return '🎯'
  if (/进化/.test(zh)) return '🧬'
  if (/逃走|走出|逃跑/.test(zh)) return '🏃'
  if (/会心/.test(zh)) return '💥'
  if (/金钱|奖金/.test(zh)) return '💰'
  if (/复制|模仿|写生/.test(zh)) return '🪞'
  if (/变身/.test(zh)) return '🔄'
  if (/防|守护|守住|壁垒|反射/.test(zh)) return '🛡️'
  if (/亲密度|友好/.test(zh)) return '💞'
  if (/交换|通信/.test(zh)) return '🔁'
  if (/连续|多次|双重|三连/.test(zh)) return '🎯'
  if (/畏缩|退缩/.test(zh)) return '😖'
  return '✨'
}


/** 精灵性别徽章（按种族的性别比字节实时显示，Gen2 offset 13） */
export function GenderBadge({ rom, baseStats, species }: { rom: { readU8: (o: number) => number }; baseStats: { offset: number; entrySize: number; firstId?: number }; species: number }) {
  const off = baseStats.offset + (species - (baseStats.firstId ?? 0)) * baseStats.entrySize + 13
  const v = rom.readU8(off)
  const icon = v === 0 ? '♂' : v === 254 ? '♀' : v === 255 ? '∅' : '♂♀'
  const color = v === 0 ? '#3f7fd4' : v === 254 ? '#e06090' : v === 255 ? 'var(--muted)' : '#8a63c9'
  const title = v === 0 ? '纯雄' : v === 254 ? '纯雌' : v === 255 ? '无性别' : '♂ ' + Math.round((255 - v) / 2.56) + '% / ♀ ' + Math.round((v + 1) / 2.56) + '%'
  return (
    <span title={'性别比 ' + v + '（' + title + '）'}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--border)', color, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
      {icon}
    </span>
  )
}
