import * as fs from 'fs'
import { Rom } from '../src/core/rom'
import { resolveTrainerGroups, readTrainerGroup } from '../src/core/trainers'
import gymRosters from '../src/core/gym-rosters.json'

const data = fs.readFileSync('C:/Users/Robin/Desktop/精灵宝可梦银 汉化版v1.2.0[Tom_C]_edited.gb')
const rom = new Rom(data, 'gb')
const groups = resolveTrainerGroups(rom)
const gym = gymRosters.find((g) => g.map === 'VioletGym')!
for (const r of gym.roster) {
  const gref = groups.find((g) => g.num === r.group)
  if (!gref) { console.log(r.label, '组不存在'); continue }
  const gd = readTrainerGroup(rom, { label: 'x' + r.group, bank: gref.bank, addr: gref.addr }, 30)
  const entry = gd.trainers[r.id - 1]
  console.log(r.label, '组' + r.group + '#' + r.id, '->', entry ? entry.mons.map((m) => `lv${m.level}#${m.species}`).join(' ') : '(解析失败: 共' + gd.trainers.length + '人)')
}
