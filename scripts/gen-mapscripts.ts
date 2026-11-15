/**
 * 从 pret 符号表生成 Gen2 全部地图脚本标签 JSON（用于地点人物扫描）
 */
import * as fs from 'fs'

const sym = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/)
const maps: Array<{ label: string; bank: number; addr: number }> = []

for (const line of sym) {
  const m = line.match(/^([0-9a-fA-F]{2}):([0-9a-fA-F]{4}) ([A-Za-z0-9_]+_MapScripts)$/)
  if (!m) continue
  maps.push({ label: m[3].replace(/_MapScripts$/, ''), bank: parseInt(m[1], 16), addr: parseInt(m[2], 16) })
}

maps.sort((a, b) => a.bank * 0x10000 + a.addr - (b.bank * 0x10000 + b.addr))
console.log(`maps: ${maps.length}`)
console.log('gyms:', maps.filter((m) => /Gym/i.test(m.label)).map((m) => m.label).join(', '))
fs.writeFileSync(process.argv[3], JSON.stringify(maps, null, 1))
