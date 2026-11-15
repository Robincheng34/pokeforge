import * as fs from 'fs'

function parseEntry(d: Buffer, off: number): { evo: number; learns: number } | null {
  let cur = off
  let evo = 0
  for (let n = 0; n < 8; n++) {
    const t = d[cur]
    if (t === 0) { cur++; break }
    const len = t >= 1 && t <= 4 ? 3 : t === 5 ? 4 : -1
    if (len < 0) return null
    evo++
    cur += len
    if (cur > d.length) return null
  }
  let learns = 0
  for (let n = 0; n < 20; n++) {
    const lv = d[cur]
    if (lv === 0) break
    const mv = d[cur + 1]
    if (lv > 100 || mv === 0 || mv > 254) return null
    learns++
    cur += 2
  }
  return learns > 0 ? { evo, learns } : null
}

for (const f of [
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪 - 水晶 (简) .gbc',
  'C:/Users/Robin/Desktop/精灵宝可梦银 汉化版v1.2.0[Tom_C]_edited.gb',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-金.gbc'
]) {
  const d = fs.readFileSync(f)
  let found = 0
  for (let x = 0x4000; x < d.length - 252 * 2; x++) {
    // 检查前 6 个指针：全部有效，且指向的条目可解析
    const ptrs: number[] = []
    let ok = true
    for (let k = 0; k < 6; k++) {
      const p = d[x + k * 2] | (d[x + k * 2 + 1] << 8)
      if (p < 0x4000 || p >= 0x8000) { ok = false; break }
      ptrs.push(p)
    }
    if (!ok) continue
    // 尝试各 bank
    for (let b = 1; b < 0x80 && b < d.length / 0x4000; b++) {
      const r0 = parseEntry(d, b * 0x4000 + (ptrs[0] - 0x4000))
      if (!r0 || r0.evo !== 1 || r0.learns < 4) continue // Bulbasaur: 1条进化(lv16→2), 多条学习
      let all = 0
      for (let k = 0; k < 6; k++) {
        const r = parseEntry(d, b * 0x4000 + (ptrs[k] - 0x4000))
        if (r) all++
      }
      if (all === 6) {
        console.log(f.split('/').pop(), '-> 指针表 @0x' + x.toString(16), '数据 bank 0x' + b.toString(16), `Bulbasaur: ${r0.evo}进化 ${r0.learns}技能`)
        found++
        break
      }
    }
    if (found) break
  }
  if (!found) console.log(f.split('/').pop(), '-> 未找到')
}
