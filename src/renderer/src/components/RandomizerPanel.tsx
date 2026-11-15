import { useState } from 'react'
import type { OpenedRom } from '../App'
import { resolveTrainerGroups, readTrainerGroup } from '@core/trainers'
import { getWildTables } from '@core/wild'
import { randomizeWild, randomizeTrainers, randomizeStarters, mulberry32 } from '@core/randomizer'
import { speciesName } from '@core/names'
import { wildStoryIndex } from '@core/wild'

interface Props {
  opened: OpenedRom
  onChange: () => void
}

export default function RandomizerPanel({ opened, onChange }: Props) {
  const { rom, profile } = opened
  const [seed, setSeed] = useState('1337')
  const [wild, setWild] = useState(true)
  const [trainers, setTrainers] = useState(true)
  const [trainerMoves, setTrainerMoves] = useState(false)
  const [starters, setStarters] = useState(true)
  const [legendaries, setLegendaries] = useState(false)
  const [uniformPerTable, setUniformPerTable] = useState(false)
  const [randomLevels, setRandomLevels] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  if (profile.gen !== 2) {
    return <div className="empty"><h2>随机化器</h2><p>当前版本仅支持 Gen 2（金/银/水晶）。</p></div>
  }

  function apply() {
    const opts = {
      seed: parseInt(seed, 10) || 1337,
      wild, trainers, starters, trainerMoves,
      includeLegendaries: legendaries,
      wildUniformPerTable: uniformPerTable,
      wildRandomLevels: randomLevels
    }
    const tables = getWildTables(rom)
    let wildChanged = 0
    let trainerChanged = 0
    let startersPicked: number[] = []
    if (opts.wild) wildChanged = randomizeWild(rom, [...tables.grass].sort((a, b) => wildStoryIndex(a.label) - wildStoryIndex(b.label)), opts)
    if (opts.trainers) {
      const groups = resolveTrainerGroups(rom)
      const sorted = [...groups].sort((a, b) => a.bank * 0x10000 + a.addr - (b.bank * 0x10000 + b.addr))
      trainerChanged = randomizeTrainers(rom, groups, opts, (g) => {
        const idx = sorted.findIndex((x) => x.addr === g.addr)
        const next = sorted[idx + 1]
        return next && next.bank === g.bank ? next.bank * 0x4000 + (next.addr - 0x4000) : rom.size
      })
    }
    if (opts.starters && profile.starters) {
      startersPicked = randomizeStarters(rom, profile.starters.slots, opts)
    }
    setResult(
      `完成！野生遭遇改写 ${wildChanged} 处；训练家改写 ${trainerChanged} 处；` +
      (startersPicked.length ? `初始三选一 → ${startersPicked.map((x) => speciesName(x)).join(' / ')}` : '初始未改动') +
      `（种子 ${opts.seed}）`
    )
    onChange()
  }

  const chk = (v: boolean, set: (b: boolean) => void, label: string, hint?: string) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
      <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} />
      <span>{label}{hint ? <span style={{ color: 'var(--muted)' }}> — {hint}</span> : null}</span>
    </label>
  )

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>🎲 随机化器</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>种子</span>
          <input value={seed} onChange={(e) => setSeed(e.target.value)} style={{ width: 120, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '6px 10px', font: 'inherit' }} />
          <button className="secondary" onClick={() => setSeed(String(Math.floor(Math.random() * 99999)))}>随机种子</button>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>同一种子 → 同一结果，可分享朋友复现</span>
        </div>
        {chk(wild, setWild, '随机化野生遭遇', '物种随机')}
        {wild && chk(uniformPerTable, setUniformPerTable, '　└ 每张表统一物种', '整片草丛同一只（按时段分三种）')}
        {wild && chk(randomLevels, setRandomLevels, '　└ 随机化等级', '在原表等级范围内波动')}
        {chk(trainers, setTrainers, '随机化训练家队伍', '保留等级与队伍规模')}
        {chk(trainerMoves, setTrainerMoves, '连训练家的招式也随机', '可能失衡，慎选')}
        {chk(starters, setStarters, '随机化初始三选一', '三只互不相同')}
        {chk(legendaries, setLegendaries, '允许神兽出现在随机池', '梦幻/超梦/三圣兽/洛奇亚/凤王/雪拉比')}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={apply}>🎲 应用随机化</button>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>所有改动进入「修改记录」，可全部复原；满意后保存并导出 IPS 补丁分享</span>
        </div>
        {result && (
          <div style={{ background: 'rgba(158,206,106,0.12)', border: '1px solid var(--ok)', borderRadius: 6, padding: '8px 12px', color: 'var(--ok)' }}>
            {result}
          </div>
        )}
      </div>
    </div>
  )
}
