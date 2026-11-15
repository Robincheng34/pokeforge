import itemIdentifiers from '@core/item-identifiers.json'
import gen1Identifiers from '@core/gen1-item-identifiers.json'

const IDENTIFIERS = itemIdentifiers as Record<number, string>
const GEN1_IDENTIFIERS = gen1Identifiers as Record<number, string>

interface Props {
  kind: 'pokemon' | 'item'
  id: number
  size?: number
  /** 道具图标按世代取标识符（Gen1 道具 id 与 Gen2/PokeAPI id 从 5 号起分叉） */
  gen?: number
}

/** 统一图标组件：精灵/道具缺图时回退到占位徽章 */
export default function PFIcon({ kind, id, size = 32, gen }: Props) {
  let src = ''
  if (kind === 'pokemon') {
    if (id >= 1 && id <= 252) src = `./icons/pokemon/${id}.png`
  } else if (gen === 1) {
    const ident = GEN1_IDENTIFIERS[id]
    if (ident) src = `./icons/items/${ident}.png`
    else if (id >= 0xc9 && id <= 0xfa) src = './icons/items/tm-normal.png'
    if (ident && ident.startsWith('emoji:')) {
      return (
        <span
          style={{
            width: size, height: size, borderRadius: '50%',
            background: 'var(--panel)', border: '1px solid var(--border)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.55, flexShrink: 0
          }}
          title={ident.slice(6)}
        >
          {ident.slice(6)}
        </span>
      )
    }
  } else {
    if (id >= 1 && id <= 95) {
      const ident = IDENTIFIERS[id]
      if (ident) src = `./icons/items/${ident}.png`
    } else if (id >= 173 && id <= 229) {
      src = './icons/items/tm-normal.png'
    }
  }
  if (!src) {
    return (
      <span
        style={{
          width: size, height: size, borderRadius: '50%',
          background: 'var(--panel)', border: '1px solid var(--border)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.45, color: 'var(--muted)', flexShrink: 0
        }}
      >
        ?
      </span>
    )
  }
  return (
    <img
      src={src}
      width={size}
      height={size}
      style={{ objectFit: 'contain', flexShrink: 0, background: 'rgba(255,255,255,0.06)', borderRadius: 6, border: '1px solid var(--border)' }}
      onError={(e) => {
        const el = e.currentTarget
        el.style.display = 'none'
      }}
      alt=""
    />
  )
}

/** 人物头像（按身份着色的圆形徽章） */
export function PersonAvatar({ label, boss }: { label: string; boss?: boolean }) {
  const emoji = boss
    ? '👑'
    : label.includes('火箭队')
      ? '🎭'
      : label.includes('道馆') || label.includes('四天王') || label.includes('冠军')
        ? '🏅'
        : label.includes('博士')
          ? '🔬'
          : '🎯'
  return (
    <span
      style={{
        width: 34, height: 34, borderRadius: '50%',
        background: boss ? 'linear-gradient(135deg, #f7c948, #e0a020)' : 'linear-gradient(135deg, #5b6ea8, #3b4a80)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, flexShrink: 0, border: '1px solid var(--border)'
      }}
    >
      {emoji}
    </span>
  )
}
