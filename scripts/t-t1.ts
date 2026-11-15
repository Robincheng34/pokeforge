import { readFileSync } from 'fs'
import { Rom } from '../src/core/rom'
import { findGen1Trainers, readGen1Class, GYMS_GEN1 } from '../src/core/trainers-gen1'
import { findWildPointersGen1, readGen1Wild, listGen1WildMaps } from '../src/core/wild-gen1'
const rom = new Rom(readFileSync('F:/新建文件夹 (2)/Pokémon/Game Boy/Pokémon-Red.gbc'))
const td = findGen1Trainers(rom)
console.log('trainers 表:', td ? '@0x' + td.tableOff.toString(16) + ' bank ' + td.bank : null)
if (td) {
  for (const g of GYMS_GEN1.slice(0, 4)) {
    const trs = readGen1Class(rom, td, g.cls)
    console.log(g.name, g.sub, trs.length + ' 人', trs.map((t) => '{' + t.mons.map((m) => `#${m.species}L${m.level}`).join(',') + '}').join(''))
  }
  const brock = readGen1Class(rom, td, 34)
  console.log('小刚验证: 应为 #74 小拳石 L12 / #75 大岩蛇 L14 →', brock[0]?.mons.map((m) => `#${m.species}L${m.level}`).join(','))
}
const wt = findWildPointersGen1(rom)
console.log('wild 表:', wt ? '@0x' + wt.tableOff.toString(16) + ' bank ' + wt.bank + ' count ' + wt.count : null)
if (wt) {
  const maps = listGen1WildMaps(rom, wt)
  console.log('有野生数据的地图数:', maps.length)
  const r1 = readGen1Wild(rom, wt, 12)
  console.log('1号道路: 草丛率', r1?.grassRate, 'slots', r1?.grass.slice(0, 4).map((s) => `#${s.species}L${s.level}`).join(','))
}
