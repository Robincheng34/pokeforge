import * as fs from 'fs'

function parseMart(d: Buffer, off: number): { count: number; items: number[] } | null {
  const count = d[off]
  if (count < 1 || count > 10) return null
  const items: number[] = []
  for (let k = 0; k < count; k++) {
    const it = d[off + 1 + k]
    if (it === 0 || it === 0xff || it > 0xff) return null
    items.push(it)
  }
  if (d[off + 1 + count] !== 0xff) return null
  return { count, items }
}

for (const f of [
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-金.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪 - 水晶 (简) .gbc',
  'C:/Users/Robin/Desktop/精灵宝可梦银 汉化版v1.2.0[Tom_C]_edited.gb'
]) {
  const d = fs.readFileSync(f)
  let found = 0
  for (let x = 0x4000; x < d.length - 128; x++) {
    const ptrs: number[] = []
    let ok = true
    for (let k = 0; k < 6; k++) {
      const p = d[x + k * 2] | (d[x + k * 2 + 1] << 8)
      if (p < 0x4000 || p >= 0x8000) { ok = false; break }
      ptrs.push(p)
    }
    if (!ok) continue
    for (let b = 1; b < 0x80 && b < d.length / 0x4000; b++) {
      const r0 = parseMart(d, b * 0x4000 + (ptrs[0] - 0x4000))
      if (!r0) continue
      let all = 0
      for (let k = 0; k < 6; k++) {
        if (parseMart(d, b * 0x4000 + (ptrs[k] - 0x4000))) all++
      }
      if (all === 6) {
        // 数总店数
        let count = 0
        for (let n = 0; n < 100; n++) {
          const p = d[x + n * 2] | (d[x + n * 2 + 1] << 8)
          if (p < 0x4000 || p >= 0x8000) break
          if (!parseMart(d, b * 0x4000 + (p - 0x4000))) break
          count++
        }
        console.log(f.split('/').pop(), '-> 指针表 @0x' + x.toString(16), '数据 bank 0x' + b.toString(16), `${count} 家店`)
        // 打印第 1 家店的物品
        const m = parseMart(d, b * 0x4000 + (ptrs[0] - 0x4000))!
        console.log('  第1家店:', m.items.join(', '))
        found++
        break
      }
    }
    if (found) break
  }
  if (!found) console.log(f.split('/').pop(), '-> 未找到')
}
