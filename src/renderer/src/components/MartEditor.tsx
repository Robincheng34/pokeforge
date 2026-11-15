import { useMemo, useState } from 'react'
import type { OpenedRom } from '../App'
import { findMartsPointerTable, readMart, itemLabel, SELLABLE_ITEMS, findMartsGen1, writeGen1MartItem } from '@core/marts'
import gen1ZhRaw from '@core/gen1-items-zh.json'
const gen1Zh = gen1ZhRaw as Record<number, string>
import PFIcon from './PFIcon'
import itemIdentifiers from '@core/item-identifiers.json'

const IDENT = itemIdentifiers as Record<number, string>
function itemIdent(id: number): string { return IDENT[id] ?? '' }

interface Props {
  opened: OpenedRom
  onChange: () => void
}

const MART_NAMES = [
  '吉花市商店',
  '吉花市商店（获得图鉴后）',
  '桔梗市商店',
  '桧皮市商店',
  '湛蓝市商店',
  '满金百货 2F（1）',
  '满金百货 2F（2）',
  '满金百货 3F',
  '满金百货 4F',
  '满金百货 5F（1）',
  '满金百货 5F（2）',
  '满金百货 5F（3）',
  '满金百货 5F（4）',
  '浅黄市商店',
  '缘朱市商店',
  '卡吉市商店（前）',
  '卡吉市商店（后）',
  '烟墨市商店',
  '常磐市商店（关都）',
  '尼比市商店（关都）',
  '华蓝市商店（关都）',
  '紫苑镇商店（关都）',
  '枯叶市商店（关都）',
  '玉虹百货 2F（1）',
  '玉虹百货 2F（2）',
  '玉虹百货 3F（关都）',
  '玉虹百货 4F（关都）',
  '玉虹百货 5F（1）',
  '玉虹百货 5F（2）',
  '浅红市商店（关都）',
  '金黄市商店（关都）',
  '月见山商店（关都）',
  '联盟联盟塔商店',
  '地下通道商店（关都）'
]

const GEN1_MART_NAMES = ["常磐市商店","尼比市商店","华蓝市商店","枯叶市商店","紫苑镇商店","玉虹百货 2F（1）","玉虹百货 2F（2）","玉虹百货 4F","玉虹百货 5F（1）","玉虹百货 5F（2）","浅红市商店","（未引用·测试店）","红莲岛商店","金黄市商店","石英高原商店"]

export default function MartEditor({ opened, onChange }: Props) {
  const { rom, profile } = opened
  const isGen1 = profile.gen === 1
  const [, tick1] = useState(0)

  if (isGen1) {
    const marts = useMemo(() => findMartsGen1(rom), [opened])
    const sel = useState(0)
    const [selIdx, setSelIdx] = sel
    const cur = marts[Math.min(selIdx, Math.max(0, marts.length - 1))]
    const items1 = Array.from({ length: 0x53 }, (_, k) => k + 1).concat(Array.from({ length: 0xfa - 0xc9 + 1 }, (_, k) => 0xc9 + k))
    return (
      <div style={{ maxWidth: 860 }}>
        <div className="searchbar">
          <select
            value={selIdx}
            onChange={(e) => setSelIdx(parseInt(e.target.value, 10))}
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '6px 10px', font: 'inherit', width: 'auto' }}
          >
            {marts.map((mm, i) => (
              <option key={mm.offset} value={i}>{(GEN1_MART_NAMES[i] ?? '商店 ' + (i + 1)) + ' · ' + mm.count + ' 种'}</option>
            ))}
          </select>
          <span className="badge">货架数据 @ 0x{cur?.offset.toString(16) ?? '?'} · 共 {marts.length} 家商店</span>
        </div>
        {cur && (
          <table className="grid">
            <thead><tr><th>#</th><th>道具（{cur.count} 种，数量不可增减）</th></tr></thead>
            <tbody>
              {cur.items.map((it, k) => (
                <tr key={k}>
                  <td>{k + 1}</td>
                  <td className="name">
                    <select
                      value={it}
                      key={'g1m' + k + '-' + it}
                      onChange={(e) => { writeGen1MartItem(rom, cur, k, parseInt(e.target.value, 10)); onChange(); tick1((t) => t + 1) }}
                      style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                    >
                      {items1.map((iid) => (
                        <option key={iid} value={iid}>{gen1Zh[iid] ?? '#' + iid}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
          Gen1 货架数据嵌在文本库（script_mart）。只能改各槽位道具，<strong>不能增减种类数量</strong>（会移位后续文本数据导致脚本错乱）。
          商店名按 pokered 标准布局顺序标注，实际以当前 ROM 为准。
        </p>
      </div>
    )
  }
  const [martIdx, setMartIdx] = useState(0)

  if (profile.gen !== 2) {
    return <div className="empty"><h2>商店货架</h2><p>当前版本仅支持 Gen 2。</p></div>
  }

  const table = useMemo(() => findMartsPointerTable(rom), [opened])
  const mart = useMemo(() => (table ? readMart(rom, table.tableOffset, 0x05, martIdx) : null), [table, martIdx, rom.modifiedCount])

  if (!table) {
    return (
      <div className="empty">
        <h2>商店货架</h2>
        <p>当前 ROM 的商店指针表被搬移（Tom_C 等深度魔改版），暂不可编辑。标准布局的金/银/水晶可用。</p>
      </div>
    )
  }

  function change(itemOff: number, raw: string) {
    const v = parseInt(raw, 10)
    if (Number.isNaN(v) || v < 1 || v > 95) return
    rom.writeU8(itemOff, v)
    onChange()
  }

  const name = MART_NAMES[martIdx] ?? `商店 ${martIdx + 1}`

  return (
    <>
      <div className="searchbar">
        <select
          value={martIdx}
          onChange={(e) => setMartIdx(parseInt(e.target.value, 10))}
          style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', font: 'inherit', width: 'auto' }}
        >
          {Array.from({ length: table.count }, (_, i) => i).map((i) => (
            <option key={i} value={i}>{MART_NAMES[i] ?? `商店 ${i + 1}`}</option>
          ))}
        </select>
        <span className="badge">指针表 @ 0x{table.tableOffset.toString(16)} · 共 {table.count} 家店</span>
      </div>
      {mart && (
        <table className="grid">
          <thead>
            <tr>
              <th>#</th>
              <th>出售物品</th>
            </tr>
          </thead>
          <tbody>
            {mart.items.map((it, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td className="name"><span className="pf-icon-cell"><PFIcon kind="item" id={it.item} size={40} />
                  <select
                    value={it.item}
                    onChange={(e) => change(it.off, e.target.value)}
                    style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 'auto' }}
                  >
                    {SELLABLE_ITEMS.map((iid) => (
                      <option key={iid} value={iid}>{itemLabel(iid)}</option>
                    ))}
                  </select></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ color: 'var(--muted)', marginTop: 8 }}>
        货架条目为原地编辑（数量增删暂不支持）。改名店铺顺序对应游戏内商店，个别顺序可能有出入，改后进游戏确认。
      </p>
    </>
  )
}
