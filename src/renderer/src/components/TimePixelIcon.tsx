/**
 * GBC 风格时段像素图标：清晨（半日升出地平线）/ 白天（太阳）/ 夜晚（月牙+星）
 * 像素画 + crispEdges 渲染，还原 Game Boy Color 质感
 */
const PALETTE: Record<string, string> = {
  Y: '#f8d020', // 亮黄（太阳主体）
  O: '#e89020', // 橙（清晨太阳/阴影）
  W: '#f8f0c0', // 淡黄（高光）
  H: '#b06820', // 地平线
  S: '#8870d8', // 夜空紫
  M: '#e8e8f8', // 月亮
  T: '#8890e0', // 星星
  '.': 'transparent'
}

const MAPS: Record<string, string[]> = {
  // 清晨：半日升出地平线 + 地平线
  清晨: [
    '..........',
    '..........',
    '....WW....',
    '...YOOY...',
    '..YOYYOY..',
    '..YOOOOY..',
    '..YOOOOY..',
    '.YOOOOOOY.',
    'HHHHHHHHHH',
    '.S......S.'
  ],
  // 白天：太阳 + 光芒
  白天: [
    'Y...WW...Y',
    '.Y.WWWWW.Y',
    '..WWWWWW..',
    '.WWWWWWWW.',
    'WWWWWWWWWW',
    'WWWWWWWWWW',
    '.WWWWWWWW.',
    '..WWWWWW..',
    '.Y.WWWWW.Y',
    'Y...WW...Y'
  ],
  // 夜晚：月牙 + 星星
  夜晚: [
    '...MM..T..',
    '..MM......',
    '.MMM......',
    '.MMM.....T',
    'MMM.......',
    'MMM.......',
    'MMM.......',
    '.MMM......',
    '..MM....T.',
    '...MM.....'
  ]
}

export default function TimePixelIcon({ time, size = 40 }: { time: string; size?: number }) {
  const map = MAPS[time] ?? MAPS['白天']
  const w = map[0].length
  const h = map.length
  const rects: Array<{ x: number; y: number; c: string }> = []
  map.forEach((row, y) => {
    row.split('').forEach((ch, x) => {
      if (ch !== '.' && PALETTE[ch]) rects.push({ x, y, c: PALETTE[ch] })
    })
  })
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      style={{ display: 'block', imageRendering: 'pixelated', flexShrink: 0 }}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={1.02} height={1.02} fill={r.c} />
      ))}
    </svg>
  )
}
