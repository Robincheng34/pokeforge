import { useMemo, useState } from 'react'
import type { OpenedRom } from '../App'
import {
  findItemAttrTable, readItemAttr, writeItemAttrField, copyItemAttrs,
  itemDisplayName, POCKET_OPTIONS, heldEffectLabel, HELD_EFFECT_ZH, ITEM_FUNCTIONS, type ItemAttr
} from '@core/itemattrs'
import { findItemEffectsTable, readItemEffectsEntries, writeItemEffect } from '@core/itemeffects'
import PFIcon from './PFIcon'
import gen2Zh from '@core/gen2-items-zh.json'
import gen1ZhRaw from '@core/gen1-items-zh.json'
const gen1Zh = gen1ZhRaw as Record<number, string>
import { findItemPricesGen1, readGen1Price, writeGen1Price } from '@core/itemattrs'

interface Props {
  opened: OpenedRom
  onChange: () => void
}

const POCKETS = Object.entries(POCKET_OPTIONS).map(([k, v]) => ({ value: Number(k), label: v }))

export default function ItemsAttrEditor({ opened, onChange }: Props) {
  const { rom, profile } = opened
  const [id, setId] = useState(1)
  const [filter, setFilter] = useState('')
  const [copyTarget, setCopyTarget] = useState(1)

  const isGen1 = profile.gen === 1

  // ---- Gen1：价格表（初代无持有效果/口袋概念，可编辑的只有价格）----
  if (isGen1) {
    const tableOff = useMemo(() => findItemPricesGen1(rom), [opened])
    const [, tick] = useState(0)
    const items = Array.from({ length: 0x53 }, (_, k) => k + 1).filter(
      (x) => !filter.trim() || String(x) === filter.trim() || (gen1Zh[x] ?? '').includes(filter.trim())
    )
    return (
      <div style={{ maxWidth: 860 }}>
        <div className="searchbar">
          <input placeholder="过滤道具（编号/名称）" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <span className="badge">价格表 @ 0x{tableOff?.toString(16) ?? '?'} · BCD 3 字节/道具 · 共 83 项</span>
        </div>
        {tableOff === null ? (
          <div style={{ color: 'var(--danger)' }}>未定位到价格表（该 ROM 结构异常）。</div>
        ) : (
          <table className="grid">
            <thead><tr><th>#</th><th>道具</th><th>价格（元）</th></tr></thead>
            <tbody>
              {items.map((x) => (
                <tr key={x}>
                  <td>{x}</td>
                  <td className="name"><span className="pf-icon-cell"><PFIcon kind="item" id={x} size={32} gen={1} />
                    <span className="pf-name-text">{gen1Zh[x] ?? '#' + x}</span></span></td>
                  <td>
                    <input
                      defaultValue={readGen1Price(rom, tableOff, x)}
                      key={'g1p' + x + '-' + readGen1Price(rom, tableOff, x)}
                      style={{ width: 72 }}
                      onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v) && v >= 0 && v <= 9999) { writeGen1Price(rom, tableOff, x, v); onChange(); tick((t) => t + 1) } }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
          Gen1（红绿蓝黄）没有携带道具/持有效果/口袋分类的概念——道具的可编辑属性只有商店价格。
          大师球等剧情获得的道具价格 0 不影响游戏。招式机价格在游戏内按 TM 编号单独计算，不在此表。
        </p>
      </div>
    )
  }

  if (profile.gen !== 2) {
    return <div className="empty"><h2>道具属性表</h2><p>当前版本仅支持 Gen 1 / Gen 2。</p></div>
  }

  const tableOffset = useMemo(() => findItemAttrTable(rom), [opened])
  const effectTable = useMemo(() => findItemEffectsTable(rom), [opened])
  const effectEntries = useMemo(() => (effectTable ? readItemEffectsEntries(rom, effectTable) : []), [effectTable, rom.modifiedCount])
  const effectOptions = useMemo(() => {
    if (!effectTable) return []
    const opts = Array.from(effectTable.addrLabel.entries()).map(([addr, zh]) => ({ addr, zh }))
    opts.sort((a, b) => a.addr - b.addr)
    return opts
  }, [effectTable, rom.modifiedCount])
  const curEffect = useMemo(() => (effectTable ? effectEntries.find((e) => e.id === id) : null), [effectEntries, id])
  const attr = useMemo(() => (tableOffset !== null ? readItemAttr(rom, tableOffset, id) : null), [tableOffset, id, rom.modifiedCount])

  // 物品选择列表：1-95 常用道具 + TM/HM（173-229）
  const options = useMemo(() => {
    const list: Array<{ id: number; label: string }> = []
    const zhMap = gen2Zh as Record<number, string>
    for (let i = 1; i <= 95; i++) {
      const nm = itemDisplayName(i)
      if (zhMap[i] === '未使用' || zhMap[i] === '（无）') continue
      if (filter.trim() && !nm.includes(filter.trim()) && String(i) !== filter.trim()) continue
      list.push({ id: i, label: nm })
    }
    for (let i = 173; i <= 229; i++) {
      if (filter.trim() && !itemDisplayName(i).includes(filter.trim().toUpperCase())) continue
      list.push({ id: i, label: itemDisplayName(i) })
    }
    return list
  }, [filter])

  function update(field: 'price' | 'heldEffect' | 'param', raw: string, max = 65535) {
    const v = parseInt(raw, 10)
    if (Number.isNaN(v) || v < 0 || v > max || !attr) return
    writeItemAttrField(rom, id, tableOffset!, field, v)
    onChange()
  }

  function togglePermission(mask: number) {
    if (!attr) return
    const nv = attr.permissions ^ mask
    writeItemAttrField(rom, id, tableOffset!, 'permissions', nv)
    onChange()
  }

  return (
    <>
      <div className="searchbar">
        <select
          value={id}
          onChange={(e) => setId(parseInt(e.target.value, 10))}
          style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', font: 'inherit', width: 'auto' }}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        <input placeholder="过滤道具名" value={filter} onChange={(e) => setFilter(e.target.value)} />
        {tableOffset !== null ? (
          <span className="badge">属性表 @ 0x{tableOffset.toString(16)} · 256 项 × 7 字节</span>
        ) : (
          <span className="badge" style={{ color: 'var(--danger)' }}>未定位属性表</span>
        )}
      </div>

      {attr && tableOffset !== null && (
        <>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <strong style={{ color: 'var(--accent)', fontSize: 12.5 }}>⚡ 快捷操作</strong>
          <span style={{ fontSize: 12.5 }}>价格：</span>
          {[1, 99, 9999].map((p) => (
            <button key={p} className="secondary" style={{ padding: '2px 10px', fontSize: 12 }} onClick={() => { writeItemAttrField(rom, id, tableOffset, 'price', p); onChange() }}>{p} 元</button>
          ))}
          <span style={{ fontSize: 12.5, marginLeft: 8 }}>复制全部属性到：</span>
          <select value={copyTarget} onChange={(e) => setCopyTarget(parseInt(e.target.value, 10))}
            style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}>
            {options.map((o) => (<option key={o.id} value={o.id}>{o.label}</option>))}
          </select>
          <button style={{ padding: '2px 10px', fontSize: 12 }} onClick={() => { copyItemAttrs(rom, tableOffset, id, copyTarget); onChange() }}>复制</button>
        </div>
        <div style={{ background: 'rgba(122,162,247,0.1)', border: '1px solid var(--accent)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13.5 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><PFIcon kind="item" id={attr.id} size={48} /><span style={{ color: 'var(--accent)', fontWeight: 700 }}>{itemDisplayName(attr.id)}</span></span>
          <span style={{ marginLeft: 10 }}>📦 {ITEM_FUNCTIONS[attr.id] ?? '未在正常流程中使用'}</span>
        </div>
        <table className="grid" style={{ minWidth: 560 }}>
          <tbody>
            <tr>
              <td className="name">道具</td>
              <td style={{ textAlign: 'left' }}>{itemDisplayName(attr.id)}（id 0x{attr.id.toString(16)}）</td>
            </tr>
            <tr>
              <td className="name">价格（¥）</td>
              <td style={{ textAlign: 'left' }}>
                <input
                  defaultValue={attr.price}
                  key={`price-${id}-${attr.price}`}
                  style={{ width: 100 }}
                  onBlur={(e) => update('price', e.target.value, 9999)}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  title="0-9999，16 位小端存储"
                />
                <span style={{ color: 'var(--muted)', marginLeft: 8 }}>原始值: 0x{attr.price.toString(16).padStart(4, '0')}</span>
              </td>
            </tr>
            <tr>
              <td className="name">持有效果</td>
              <td style={{ textAlign: 'left' }}>
                <select
                  value={attr.heldEffect}
                  onChange={(e) => update('heldEffect', e.target.value, 255)}
                  style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                >
                  {Object.keys(HELD_EFFECT_ZH).map(Number).sort((a, b) => a - b).map((k) => (
                    <option key={k} value={k}>{heldEffectLabel(k)}</option>
                  ))}
                </select>
                <span style={{ color: 'var(--muted)', marginLeft: 8, fontSize: 12 }}>携带后的效果（如剩饭回血）</span>
              </td>
            </tr>
            <tr>
              <td className="name">使用效果</td>
              <td style={{ textAlign: 'left' }}>
                {effectTable && curEffect ? (
                  <>
                  <select
                    value={curEffect.ptr}
                    onChange={(e) => { writeItemEffect(rom, effectTable, id, parseInt(e.target.value, 10)); onChange() }}
                    style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                  >
                    {effectOptions.map((o) => (
                      <option key={o.addr} value={o.addr}>{o.zh}（0x{o.addr.toString(16)}）</option>
                    ))}
                  </select>
                  <span style={{ color: 'var(--muted)', marginLeft: 8, fontSize: 12 }}>使用道具时执行的功能（如回复 HP、治愈异常、进化、捕捉）</span>
                  </>
                ) : (
                  <span style={{ color: 'var(--danger)' }}>效果表未定位，无法编辑</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="name">参数</td>
              <td style={{ textAlign: 'left' }}>
                <input
                  defaultValue={attr.param}
                  key={`param-${id}-${attr.param}`}
                  style={{ width: 100 }}
                  onBlur={(e) => update('param', e.target.value, 255)}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  title="效果的数值参数（如回复量比例、威力提升值）"
                />
              </td>
            </tr>
            <tr>
              <td className="name">口袋</td>
              <td style={{ textAlign: 'left' }}>
                <select
                  value={attr.pocket}
                  onChange={(e) => { writeItemAttrField(rom, id, tableOffset, 'pocket', parseInt(e.target.value, 10)); onChange() }}
                  style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                >
                  {POCKETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td className="name">权限</td>
              <td style={{ textAlign: 'left', display: 'flex', gap: 16 }}>
                <label style={{ cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={(attr.permissions & 0x40) !== 0} onChange={() => togglePermission(0x40)} />
                  不可在列表中选中/使用
                </label>
                <label style={{ cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={(attr.permissions & 0x80) !== 0} onChange={() => togglePermission(0x80)} />
                  不可丢弃
                </label>
              </td>
            </tr>
          </tbody>
        </table>
        </>
      )}
    </>
  )
}
