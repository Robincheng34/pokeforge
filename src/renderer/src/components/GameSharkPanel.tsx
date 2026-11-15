import { useMemo, useState } from 'react'
import type { OpenedRom } from '../App'
import { getGamesharkFor, type GsCode } from '@core/gameshark'

interface Props {
  opened: OpenedRom | null
}

const RISK_COLOR: Record<string, string> = {
  低: 'var(--ok)',
  中: 'var(--warning)',
  高: 'var(--danger)'
}

function CopyCode({ code }: { code: string }) {
  return (
    <button
      className="secondary"
      style={{ height: 22, padding: '0 8px', fontSize: 11, fontFamily: 'Cascadia Mono, Consolas, monospace' }}
      onClick={() => { void navigator.clipboard.writeText(code).then(() => { /* 静默复制 */ }) }}
      title="点击复制"
    >
      {code}
    </button>
  )
}

export default function GameSharkPanel({ opened }: Props) {
  const { game, reason } = useMemo(() => getGamesharkFor(opened?.profile ?? null, opened?.fileName), [opened])
  const [copied, setCopied] = useState<string | null>(null)

  function copy(code: string, key: string) {
    void navigator.clipboard.writeText(code)
    setCopied(key)
    setTimeout(() => setCopied(null), 1200)
  }

  return (
    <div style={{ maxWidth: 880 }}>
      <div className="searchbar">
        {opened && <span className="badge">{opened.fileName}</span>}
        <span className="badge">{reason}</span>
      </div>

      {!game ? (
        <div className="empty">
          <h2>金手指</h2>
          <p>打开 GB/GBC ROM（红绿蓝黄 / 金银水晶）后显示对应的 GameShark 代码。</p>
        </div>
      ) : (
        <>
          {game.note && (
            <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 12.5, color: 'var(--text-secondary)' }}>
              {game.note}
            </div>
          )}
          {game.sections.map((sec, si) => (
            <div key={si} className="card">
              <div className="card-title">{sec.title}</div>
              {sec.entries.map((entry, ei) => (
                <div key={ei} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <strong style={{ fontSize: 13 }}>{entry.name}</strong>
                    <span className="badge" style={{ color: RISK_COLOR[entry.risk], borderColor: RISK_COLOR[entry.risk] }}>风险 {entry.risk}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {entry.codes.map((c: GsCode, ci: number) => (
                      <span key={ci} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <CopyCode code={c.code} />
                        <span style={{ fontSize: 11, color: copied === entry.name + ci ? 'var(--ok)' : 'var(--muted)' }}>
                          {copied === entry.name + ci ? '已复制' : c.name}
                        </span>
                      </span>
                    ))}
                  </div>
                  {entry.note && <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{entry.note}</div>}
                  {entry.codes.some((c) => c.note) && (
                    <div style={{ color: 'var(--muted)', fontSize: 11.5, marginTop: 2 }}>
                      {entry.codes.filter((c) => c.note).map((c) => `${c.code}: ${c.note}`).join('　|　')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--accent)' }}>使用说明</strong>
            <div style={{ marginTop: 4, display: 'grid', gap: 4 }}>
              <div>① 在模拟器（mGBA / VBA / SameBoy 等）的金手指/作弊码界面输入 6 位代码并启用，然后进游戏验证效果。</div>
              <div>② 点击代码即可复制。XX 占位的代码需先替换 XX 为表中标注的十六进制值。</div>
              <div>③ 3DS VC 版可在 VC 菜单里使用兼容的 GameShark 代码；日版 / 汉化版 ROM 地址不同，标"英文版"的代码不可直接套用。</div>
              <div>④ 遇到 MissingNo 类代码（XX 超 151）等同 BUG 库中的存档风险警告——先做模拟器快照。</div>
              <div>⑤ Gen2 的大多数修改（金钱 / 背包 / 队伍 / DV / 病毒）建议直接用「存档编辑」页，比金手指更安全可控。</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
