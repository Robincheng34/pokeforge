import * as fs from 'fs'
const f = 'F:/新建文件夹 (2)/Pokémon/Game Boy Color/精灵宝可梦-水晶版/Pokemon_Crystal[T+Chi](V1.2).sav'
const d = fs.readFileSync(f)
console.log('文件大小:', d.length)
// SRAM bank1 数据: sGameData 0xA009-0xAB82 (0xB7A 字节), checksum LE16 @ 0xAD0D
// bank1 在 .sav 中的基址 = 0x2000 (SRAM bank 1)，但可能有文件头偏移
for (let base = 0; base < 128; base++) {
  const gd = base + (0x1000 * 2) + 9 // 0x2009 + base
  let sum = 0
  for (let i = 0; i < 0xb7a; i++) sum = (sum + d[gd + i]) & 0xffff
  const chk = d[base + 0x2000 + 0xad0d - 0xa000] | (d[base + 0x2000 + 0xad0e - 0xa000] << 8)
  if (sum === chk) {
    console.log('命中! base =', base, 'checksum = 0x' + sum.toString(16))
    const partyCount = d[base + 0x2000 + 0xa865 - 0xa000]
    console.log('队伍数量:', partyCount)
    // 解析队伍第一只: 结构 48B @ 0xa866
    const m0 = base + 0x2000 + 0xa866 - 0xa000
    console.log('第1只: species=' + d[m0], 'item=' + d[m0 + 1], 'moves=', d.subarray(m0 + 2, m0 + 6).toString('hex'), 'level=' + d[m0 + 31], 'hp=' + (d[m0 + 34] | (d[m0 + 35] << 8)))
    const m1 = m0 + 48
    console.log('第2只: species=' + d[m1], 'level=' + d[m1 + 31])
    break
  }
}
