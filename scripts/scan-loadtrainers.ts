/**
 * 全 ROM 扫描 loadtrainer($5D 组 号) + startbattle($5E) 配对 → 训练家战斗脚本簇
 * 每个簇 ≈ 一张地图的全部训练家
 */
import * as fs from 'fs'

const data = fs.readFileSync(process.argv[2] ?? 'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc')

interface Hit { off: number; group: number; id: number }
const hits: Hit[] = []
for (let i = 0x4000; i < data.length - 32; i++) {
  if (data[i] !== 0x5d) continue
  const g = data[i + 1]
  const t = data[i + 2]
  if (g >= 64 || t < 1 || t > 20) continue
  // 30 字节内须有 0x5e (startbattle)
  let ok = false
  for (let k = i + 3; k < i + 30; k++) if (data[k] === 0x5e) { ok = true; break }
  if (!ok) continue
  hits.push({ off: i, group: g, id: t })
}
console.log('loadtrainer 配对总数:', hits.length)

// 聚簇：相邻间隔 < 0x80 归为同簇
const clusters: Hit[][] = []
for (const h of hits) {
  const last = clusters[clusters.length - 1]
  if (last && h.off - last[last.length - 1].off < 0x80) last.push(h)
  else clusters.push([h])
}
console.log('簇数:', clusters.length)

// 找出道馆簇：馆主组 0-7 (Falkner..Clair)
const GYM_LEADERS: Array<[string, number, number]> = [
  ['桔梗道馆·阿速', 0, 1], ['满金道馆·小茜', 1, 1], ['桧皮道馆·阿吉', 2, 1],
  ['缘朱道馆·松叶', 3, 1], ['卡吉道馆·柳伯', 4, 1], ['浅黄道馆·阿蜜', 5, 1],
  ['湛蓝道馆·阿四', 6, 1], ['烟墨道馆·小桩', 7, 1]
]
for (const [name, g, id] of GYM_LEADERS) {
  const c = clusters.findIndex((cl) => cl.some((h) => h.group === g && h.id === id))
  if (c < 0) { console.log(`\n${name}: 未找到`); continue }
  console.log(`\n${name}: 簇 #${c} 共 ${clusters[c].length} 人 @0x${clusters[c][0].off.toString(16)}`)
  console.log('  ' + clusters[c].map((h) => `组${h.group}#${h.id}`).join(' '))
}
