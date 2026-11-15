import type { OpenedRom } from '../App'

interface Props {
  opened: OpenedRom
  onClose: () => void
  onChange: () => void
}

/** 修改记录面板：列出每一处修改，支持单条复原与全部复原 */
export default function ChangeLogPanel({ opened, onClose, onChange }: Props) {
  const { rom } = opened
  const ranges = rom.getDirtyRanges()

  return (
    <div
      style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 380,
        background: 'var(--panel)', borderLeft: '1px solid var(--border)',
        boxShadow: '-6px 0 24px rgba(0,0,0,0.45)', zIndex: 100,
        display: 'flex', flexDirection: 'column'
      }}
    >
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <strong style={{ color: 'var(--accent)' }}>修改记录（{ranges.length} 处）</strong>
        <div className="spacer" style={{ flex: 1 }} />
        <button
          className="secondary"
          disabled={ranges.length === 0}
          onClick={() => { rom.revertAll(); onChange() }}
        >
          全部复原
        </button>
        <button className="secondary" onClick={onClose}>关闭</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 14px' }}>
        {ranges.length === 0 && <p style={{ color: 'var(--muted)' }}>暂无修改。</p>}
        {ranges.map(([start, end]) => {
          const oldHex = Array.from({ length: end - start + 1 }, (_, k) => rom.originalByte(start + k).toString(16).padStart(2, '0')).join(' ')
          const newHex = Array.from({ length: end - start + 1 }, (_, k) => rom.readU8(start + k).toString(16).padStart(2, '0')).join(' ')
          return (
            <div
              key={start}
              style={{
                padding: '8px 10px', marginBottom: 6, background: 'var(--bg)',
                border: '1px solid var(--border)', borderRadius: 6, fontSize: 12.5,
                display: 'flex', alignItems: 'center', gap: 10
              }}
            >
              <div style={{ flex: 1, fontFamily: 'Consolas, monospace' }}>
                <div style={{ color: 'var(--muted)' }}>0x{start.toString(16)}{end > start ? ` ~ 0x${end.toString(16)}` : ''}</div>
                <div>
                  <span style={{ color: 'var(--danger)' }}>{oldHex}</span>
                  <span style={{ color: 'var(--muted)' }}> → </span>
                  <span style={{ color: 'var(--ok)' }}>{newHex}</span>
                </div>
              </div>
              <button
                className="secondary"
                onClick={() => { rom.revertRange(start, end); onChange() }}
              >
                复原
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
