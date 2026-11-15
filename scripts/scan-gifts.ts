import * as fs from 'fs'
const ROMS: Array<[string, string]> = [
  ['银', 'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc'],
  ['金', 'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-金.gbc'],
  ['Tom_C', 'C:/Users/Robin/Desktop/精灵宝可梦银 汉化版v1.2.0[Tom_C]_edited.gb'],
  ['水晶简', 'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪 - 水晶 (简) .gbc']
]
// 各赠送事件签名（物种/等级字节可改）
const GIFTS: Array<{ name: string; sig: string; speciesOff: number; levelOff: number }> = [
  { name: '伊布（比尔的家人，满金市）lv20', sig: '2d850140000', speciesOff: 1, levelOff: 2 },
  { name: '巴尔郎（空手道王信彦，擂钵山）lv10', sig: '2decca0000', speciesOff: 1, levelOff: 2 },
  { name: '烈雀+信件（35号道路门）lv10', sig: '2d400a0001', speciesOff: 1, levelOff: 2 },
  { name: '满金游戏中心抽奖 咩利羊? lv10', sig: '2db30a0000', speciesOff: 1, levelOff: 2 },
  { name: '游戏中心兑换 吸盘魔偶 lv15', sig: '2d7a0f0000', speciesOff: 1, levelOff: 2 },
  { name: '游戏中心兑换 伊布 lv15', sig: '2d850f0000', speciesOff: 1, levelOff: 2 },
  { name: '游戏中心兑换 多边兽 lv20', sig: '2d82140000', speciesOff: 1, levelOff: 2 },
  { name: '壶壶（湛蓝市 迷之家）lv15', sig: '3ed5ea', speciesOff: 1, levelOff: 5 }
]
for (const [label, f] of ROMS) {
  const d = fs.readFileSync(f)
  console.log('=== ' + label)
  for (const g of GIFTS) {
    const sig = Buffer.from(g.sig, 'hex')
    const hits: number[] = []
    for (let i = 0x4000; i <= d.length - sig.length; i++) {
      let ok = true
      for (let k = 0; k < sig.length; k++) if (d[i + k] !== sig[k]) { ok = false; break }
      if (ok) hits.push(i)
    }
    console.log(`  ${g.name}: ${hits.length} 处 ${hits.slice(0, 3).map((h) => '0x' + h.toString(16)).join(' ')}`)
  }
}
