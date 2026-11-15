import { useEffect, useState } from 'react'
import type { OpenedRom } from '../App'
import { GLITCHES, checkApplicable, type Glitch } from '@core/glitches'
import { GEN1_GLITCHES } from '@core/glitches-gen1'

interface Props {
  opened: OpenedRom | null
  onChange: () => void
}

const RISK_COLOR: Record<string, string> = {
  低: 'var(--ok)',
  中: 'var(--warn)',
  高: 'var(--danger)'
}

export default function GlitchesPanel({ opened }: Props) {
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  // 只显示当前世代的内容：Gen1 条目（require='gen1'）与 Gen2 条目（无 require）互斥
  const isGen1Rom = opened?.profile.gen === 1
  const source = isGen1Rom ? GEN1_GLITCHES : GLITCHES
  const curIds = source.map((x) => x.id).join(',')
  useEffect(() => { setExpanded(source[0]?.id ?? null) }, [curIds])
  const list = source.filter((g) => {
    const entryGen1 = g.require === 'gen1'
    if (isGen1Rom !== entryGen1) return false
    if (!filter.trim()) return true
    const q = filter.trim().toLowerCase()
    return g.title.toLowerCase().includes(q) || g.tags.some((t) => t.includes(filter.trim()))
  })

  return (
    <>
      <div className="searchbar">
        <input placeholder="搜索（复制 / 道具 / 开局 / 时间 …）" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <span className="badge">{list.length} 条 · {isGen1Rom ? "第一世代（红/绿/蓝/黄）专属" : "第二世代（金/银/水晶）专属"}</span>
      </div>
      {list.map((g) => {
        const open = expanded === g.id
        const applicable = checkApplicable(opened?.rom ?? null, g.require)
        return (
          <div
            key={g.id}
            style={{
              background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8,
              marginBottom: 10, overflow: 'hidden'
            }}
          >
            <div
              style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
              onClick={() => setExpanded(open ? null : g.id)}
            >
              <strong style={{ color: 'var(--accent)', fontSize: 14 }}>{open ? '▼' : '▶'} {g.title}</strong>
              <span className="badge" style={{ color: RISK_COLOR[g.risk], borderColor: RISK_COLOR[g.risk] }}>风险 {g.risk}</span>
              <span className="badge">{g.versions}</span>
              <div style={{ flex: 1 }} />
              {g.tags.map((t) => (
                <span key={t} className="badge">{t}</span>
              ))}
            </div>
            {opened && applicable && (
              <div style={{ padding: '0 14px', paddingBottom: open ? 0 : 10 }}>
                <span
                  className="badge"
                  style={{
                    color: applicable.status === 'ok' ? 'var(--ok)' : applicable.status === 'warn' ? 'var(--warn)' : 'var(--danger)',
                    borderColor: applicable.status === 'ok' ? 'var(--ok)' : applicable.status === 'warn' ? 'var(--warn)' : 'var(--danger)'
                  }}
                >
                  ROM 适用性检测：{applicable.text}
                </span>
              </div>
            )}
            {open && (
              <div style={{ padding: '0 16px 14px 16px' }}>
                <div style={{ background: 'rgba(224,175,104,0.1)', border: '1px solid rgba(224,175,104,0.4)', borderRadius: 6, padding: '8px 12px', marginBottom: 10, color: 'var(--warn)', fontSize: 12.5 }}>
                  ⚠ {g.riskNote}
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>操作步骤</div>
                <ol style={{ paddingLeft: 22, lineHeight: 1.9, fontSize: 13 }}>
                  {g.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
                <div style={{ fontWeight: 600, color: 'var(--text)', margin: '8px 0 6px' }}>补充说明</div>
                <ul style={{ paddingLeft: 22, lineHeight: 1.8, fontSize: 12.5, color: 'var(--muted)' }}>
                  {g.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
                {g.codes && g.codes.length > 0 && (
                  <>
                    <div style={{ fontWeight: 600, color: 'var(--text)', margin: '8px 0 6px' }}>🎮 相关金手指（GameShark）</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
                      {g.codes.map((c) => (
                        <div
                          key={c.code + c.name}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5,
                            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px'
                          }}
                        >
                          <span style={{ fontFamily: 'Consolas, monospace', color: 'var(--ok)', fontWeight: 600, minWidth: 110 }}>{c.code}</span>
                          <span>{c.name}</span>
                          {c.note && <span style={{ color: 'var(--muted)' }}>— {c.note}</span>}
                          <div style={{ flex: 1 }} />
                          <button
                            className="secondary"
                            style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => navigator.clipboard?.writeText(c.code)}
                          >
                            复制
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {opened && g.id.startsWith('clone') && (
                  <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 12 }}>
                    💡 提示：复制前可先用 PokéForge 的「修改记录/全部复原」+ 保存功能留个干净底档；复制大法失败时也能靠「修改记录」检查这次会话改过什么。
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
