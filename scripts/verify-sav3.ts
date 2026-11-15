import * as fs from 'fs'
const d = fs.readFileSync('F:/新建文件夹 (2)/Pokémon/Game Boy Color/精灵宝可梦-水晶版/Pokemon_Crystal[T+Chi](V1.2).sav')
// SRAM bank1 → 文件 0x0000-0x1FFF。sGameData=0x9..0xB82, sChecksum=0xAD0D
let sum = 0
for (let i = 0x9; i <= 0xb82; i++) sum = (sum + d[i]) & 0xffff
const stored = d[0xad0d] | (d[0xad0e] << 8)
console.log('计算 checksum = 0x' + sum.toString(16), '存储 = 0x' + stored.toString(16), sum === stored ? '✓ 匹配' : '✗ 不匹配')
const pc = d[0x865]
console.log('队伍数量:', pc)
const m0 = 0x866
for (let i = 0; i < Math.min(pc, 6); i++) {
  const m = m0 + i * 48
  console.log(`  第${i + 1}只: species=${d[m]} item=${d[m + 1]} moves=[${d[m + 2]},${d[m + 3]},${d[m + 4]},${d[m + 5]}] level=${d[m + 31]} hp=${d[m + 34] | (d[m + 35] << 8)} maxhp=${d[m + 36] | (d[m + 37] << 8)}`)
}
