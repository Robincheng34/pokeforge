/**
 * 从 pret 符号表生成野生遭遇表清单 JSON
 */
import * as fs from 'fs'

const symPath = process.argv[2]
const outPath = process.argv[3]

const sym = fs.readFileSync(symPath, 'utf8').split(/\r?\n/)
const grass: Array<{ label: string; bank: number; addr: number }> = []
const water: Array<{ label: string; bank: number; addr: number }> = []

for (const line of sym) {
  const m = line.match(/^([0-9a-fA-F]{2}):([0-9a-fA-F]{4}) (\S+)$/)
  if (!m) continue
  const [, bankHex, addrHex, name] = m
  const bank = parseInt(bankHex, 16)
  const addr = parseInt(addrHex, 16)
  let mm = name.match(/JohtoGrassWildMons\._def_grass_wildmons_(.+)$/)
  if (mm) grass.push({ label: mm[1], bank, addr })
  mm = name.match(/KantoGrassWildMons\._def_grass_wildmons_(.+)$/)
  if (mm) grass.push({ label: 'Kanto_' + mm[1], bank, addr })
  mm = name.match(/(?:Johto|Kanto)WaterWildMons\._def_water_wildmons_(.+)$/)
  if (mm) water.push({ label: mm[1], bank, addr })
}

console.log(`grass: ${grass.length}, water: ${water.length}`)
fs.writeFileSync(outPath, JSON.stringify({ grass, water }, null, 1))
