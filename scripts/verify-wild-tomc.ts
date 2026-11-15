import * as fs from 'fs'
import { Rom } from '../src/core/rom'
import { getWildTables, readGrassWildTable } from '../src/core/wild'

const data = fs.readFileSync('C:/Users/Robin/Desktop/精灵宝可梦银 汉化版v1.2.0[Tom_C]_edited.gb')
const rom = new Rom(data, 'gb')
const { grass, delta } = getWildTables(rom)
console.log('delta: +0x' + delta.toString(16))
const sprout = readGrassWildTable(rom, grass[0])
console.log('喇叭芽之塔2F 前 7 对:', sprout.slots.slice(0, 7).map((s) => `lv${s.level}#${s.species}`).join(' '))
const sprout3 = readGrassWildTable(rom, grass[1])
console.log('喇叭芽之塔3F 前 7 对:', sprout3.slots.slice(0, 7).map((s) => `lv${s.level}#${s.species}`).join(' '))
// 抽查后面的表（第 45 张 = ROUTE_29 附近）
const r29 = readGrassWildTable(rom, grass[44])
console.log(grass[44].label, ':', r29.slots.slice(0, 7).map((s) => `lv${s.level}#${s.species}`).join(' '))
