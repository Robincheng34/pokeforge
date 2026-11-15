import * as fs from 'fs'
import { Rom } from '../src/core/rom'
import { resolveTrainerGroups } from '../src/core/trainers'
import { readGrassWildTable, WILD_TABLES_GS } from '../src/core/wild'

const data = fs.readFileSync('C:/Users/Robin/Desktop/精灵宝可梦银 汉化版v1.2.0[Tom_C]_edited.gb')
const rom = new Rom(data, 'gb')

// 1. 训练家指针表
const groups = resolveTrainerGroups(rom)
console.log('训练家指针表:', groups.length, '组')
if (groups.length) {
  const f = groups.find((g) => g.num === 1)
  console.log('Falkner addr:', f && '0x' + (f.bank * 0x4000 + f.addr - 0x4000).toString(16))
}

// 2. 野生遭遇表：在 Tom_C 里搜索喇叭芽之塔2F 的特征字节序列
const sproutSig = Buffer.from('03130413051303130613051305130313041305130313061305130513035c045c055c0313065c05130513', 'hex')
const hits: number[] = []
for (let i = 0x4000; i <= data.length - sproutSig.length; i++) {
  if (data[i] === sproutSig[0] && data.subarray(i, i + sproutSig.length).equals(sproutSig)) hits.push(i)
}
console.log('喇叭芽之塔2F 野生表特征命中:', hits.map((h) => '0x' + h.toString(16)))
console.log('标准偏移: 0x' + (WILD_TABLES_GS.grass[0].bank * 0x4000 + WILD_TABLES_GS.grass[0].addr - 0x4000).toString(16))
// 标准偏移处的实际内容
const stockOff = WILD_TABLES_GS.grass[0].bank * 0x4000 + WILD_TABLES_GS.grass[0].addr - 0x4000
console.log('标准处内容:', data.subarray(stockOff, stockOff + 32).toString('hex'))
