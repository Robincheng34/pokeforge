import { useMemo } from 'react'
import type { OpenedRom } from '../App'
import { speciesName } from '@core/names'

interface Props {
  opened: OpenedRom
  id: number
  onChange: () => void
}

/** Gen2 蛋组常量（byte 高/低 nibble 各一个蛋组） */
const EGG_GROUPS: Record<number, string> = {
  1: '怪兽', 2: '水中1', 3: '虫', 4: '飞行', 5: '陆上', 6: '妖精', 7: '植物',
  8: '人形', 9: '水中3', 10: '矿物', 11: '不定形', 12: '水中2', 13: '百变怪',
  14: '龙', 15: '未发现'
}

const GROUP_IDS = Object.keys(EGG_GROUPS).map(Number)

export default function BreedingPanel({ opened, id, onChange }: Props) {
  const { rom, profile } = opened
  const bs = profile.baseStats
  const firstId = bs.firstId ?? 0

  const eggGroupOff = useMemo(
    () => bs.offset + (id - firstId) * bs.entrySize + 23,
    [bs, id]
  )
  const cyclesOff = useMemo(
    () => bs.offset + (id - firstId) * bs.entrySize + 15,
    [bs, id]
  )

  const eggByte = rom.readU8(eggGroupOff)
  const g1 = (eggByte >> 4) & 0x0f
  const g2 = eggByte & 0x0f
  const cycles = rom.readU8(cyclesOff)
  const steps = cycles * 256

  function setNibble(high: boolean, value: number) {
    const cur = rom.readU8(eggGroupOff)
    const nv = high ? (value << 4) | (cur & 0x0f) : (cur & 0xf0) | value
    rom.writeU8(eggGroupOff, nv)
    onChange()
  }

  function speedUpAll() {
    if (!window.confirm('把全部宝可梦的孵化周期改为 1（孵化只需 256 步）？')) return
    for (let i = 0; i < bs.count; i++) {
      rom.writeU8(bs.offset + i * bs.entrySize + 15, 1)
    }
    onChange()
  }

  const selStyle = { background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px' }

  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
      <strong style={{ color: 'var(--accent)' }}>🥚 孵蛋</strong>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        蛋组1：
        <select value={g1} onChange={(e) => setNibble(true, parseInt(e.target.value, 10))} style={selStyle}>
          {GROUP_IDS.map((gid) => (
            <option key={gid} value={gid}>{EGG_GROUPS[gid]}</option>
          ))}
        </select>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        蛋组2：
        <select value={g2} onChange={(e) => setNibble(false, parseInt(e.target.value, 10))} style={selStyle}>
          <option value={0}>无</option>
          {GROUP_IDS.map((gid) => (
            <option key={gid} value={gid}>{EGG_GROUPS[gid]}</option>
          ))}
        </select>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        孵化周期：
        <input
          defaultValue={cycles}
          key={`cycles-${id}-${cycles}`}
          style={{ width: 52, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '2px 6px', font: 'inherit' }}
          onBlur={(e) => {
            const v = parseInt(e.target.value, 10)
            if (!Number.isNaN(v) && v >= 1 && v <= 255) { rom.writeU8(cyclesOff, v); onChange() }
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        />
        （= {steps} 步）
      </span>
      <button className="secondary" onClick={speedUpAll}>⚡ 全游戏孵蛋加速（全部改为 1 周期）</button>
    </div>
  )
}
