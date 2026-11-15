import type { OpenedRom } from '../App'
import { parseHeader, detectVersion } from '@core/detect'

interface Props {
  opened: OpenedRom
  onClose: () => void
}

export default function RomInfoPanel({ opened, onClose }: Props) {
  const h = parseHeader(opened.rom.data)
  const v = detectVersion(opened.rom.data, h)
  const confColor = v.confidence === '确定' ? 'var(--ok)' : v.confidence === '疑似' ? 'var(--warn)' : 'var(--muted)'

  const rows: Array<[string, string]> = [
    ['文件名', opened.fileName],
    ['平台', opened.rom.platform === 'gba' ? 'GBA' : h.cgbFlag === 0xc0 ? 'GBC（仅彩色）' : 'GB / GBC 兼容'],
    ['头部标题', h.title],
    ['Game Code', v.id],
    ['版本判定', `${v.verdict}（${v.confidence}）`],
    ['卡带类型', v.cartTypeText],
    ['GBC 支持', v.cgbText],
    ['ROM 大小', `${opened.rom.size} 字节（${(opened.rom.size / 1024).toFixed(0)} KB）`],
    ['头部校验和', v.headerChecksumOk ? '✓ 正确' : '✗ 不匹配（改版常见，不影响使用）'],
    ['全局校验和', v.globalChecksum],
    ['识别 profile', opened.profileSource]
  ]

  return (
    <div
      style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 400,
        background: 'var(--panel)', borderLeft: '1px solid var(--border)',
        boxShadow: '-6px 0 24px rgba(0,0,0,0.45)', zIndex: 100,
        display: 'flex', flexDirection: 'column'
      }}
    >
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <strong style={{ color: 'var(--accent)' }}>ROM 信息 · 版本检测</strong>
        <div style={{ flex: 1 }} />
        <button className="secondary" onClick={onClose}>关闭</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
        <div
          style={{
            background: 'var(--bg)', border: `1px solid ${confColor}`, borderRadius: 8,
            padding: '12px 14px', marginBottom: 12
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: confColor }}>{v.verdict}</div>
          <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
            判定依据：game code「{v.id}」 + 头部标题「{h.title}」
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <tbody>
            {rows.map(([k, val]) => (
              <tr key={k}>
                <td style={{ color: 'var(--muted)', padding: '6px 4px', width: 110, verticalAlign: 'top', border: '1px solid var(--border)' }}>{k}</td>
                <td style={{ padding: '6px 8px', border: '1px solid var(--border)', wordBreak: 'break-all' }}>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 10, lineHeight: 1.7 }}>
          <strong>官方版本背景（发行时间线）：</strong>
          金银实体卡：日本 1999-11-21 → 北美 2000-10-15 → 澳洲 2000-10-13 → 欧洲 2001-04-06 → 韩国 2002-04-24（大宇发行）；
          水晶实体卡：日本 2000-12-14 → 北美 2001-07-29 → 澳洲 2001-09-30 → 欧洲 2001-11-02。
          中国大陆与拉美地区：GBC 实体卡均无官方发售。
          <br />
          3DS 虚拟主机版（VC 数字版）：金银 2017-09-22、水晶 2018-01-26，覆盖日/美/澳/欧/韩/港/台。
          <br />
          各版 game code：金 AAUE（美/欧英文）、AAUP（欧/澳英文再版）、AAUD（德）、AAUF（法）、AAUI（意）、AAUS（西）、AAUK（韩，CGB-AAUK-KOR）、AAUJ（日，社区通行值）；
          银 AAXE/AAXO/AAXF/AAXI/AAPS/AAXK（韩，CGB-AAXK-KOR）/AAXJ；
          水晶 BYTE（美）、BYTF（欧，五语言）、BXTJ（日）。
          <strong>韩文版只有金银、没有水晶实体卡。</strong>
          Tom_C 汉化银的头部 code=AAXK → 其基底是官方韩文版银，而非国际版！
        </p>
      </div>
    </div>
  )
}
