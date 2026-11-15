/** 左侧导航 SVG 图标（宝可梦风格，和名称对应） */

function PokeBall({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="7" fill="#fff" stroke="#333" strokeWidth="1"/>
      <path d="M 1 8 A 7 7 0 0 1 15 8" fill="#ee1c25"/>
      <line x1="1" y1="8" x2="15" y2="8" stroke="#333" strokeWidth="1.2"/>
      <circle cx="8" cy="8" r="2.5" fill="#fff" stroke="#333" strokeWidth="1"/>
      <circle cx="8" cy="8" r="1" fill="#666"/>
    </svg>
  )
}

function Bag({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <path d="M 5 5 L 5 3 C 5 1, 11 1, 11 3 L 11 5" fill="none" stroke="#8B6914" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="3" y="5" width="10" height="10" rx="1.5" fill="#DAA520" stroke="#8B6914" strokeWidth="1"/>
      <rect x="5.5" y="7.5" width="5" height="3.5" rx="0.5" fill="#FFF8DC" stroke="#8B6914" strokeWidth="0.8"/>
      <line x1="3" y1="8" x2="13" y2="8" stroke="#8B6914" strokeWidth="0.8"/>
    </svg>
  )
}

function Map({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <path d="M 1 3 L 6 1 L 10 3 L 15 1 L 15 13 L 10 15 L 6 13 L 1 15 Z" fill="#E8E0C8" stroke="#8B7355" strokeWidth="1" strokeLinejoin="round"/>
      <line x1="6" y1="1" x2="6" y2="13" stroke="#C0B090" strokeWidth="0.8"/>
      <line x1="10" y1="3" x2="10" y2="15" stroke="#C0B090" strokeWidth="0.8"/>
      <circle cx="8" cy="7" r="1.5" fill="#E74C3C" stroke="#333" strokeWidth="0.8"/>
    </svg>
  )
}

function Wrench({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <path d="M 12 2 C 10 1, 8 1, 6.5 3 L 9 5.5 L 5.5 9 L 3 6.5 C 1 8, 1 10, 2 12 L 5.5 9 L 13 3 Z"
        fill="#95A5A6" stroke="#5A6A6B" strokeWidth="0.8" strokeLinejoin="round" transform="rotate(0 8 8)"/>
      <circle cx="4" cy="12" r="1.5" fill="#95A5A6" stroke="#5A6A6B" strokeWidth="0.8"/>
    </svg>
  )
}

export function NavIcon({ category, size = 18 }: { category: string; size?: number }) {
  switch (category) {
    case 'species': return <PokeBall size={size} />
    case 'items': return <Bag size={size} />
    case 'world': return <Map size={size} />
    case 'tools': return <Wrench size={size} />
    default: return <PokeBall size={size} />
  }
}
