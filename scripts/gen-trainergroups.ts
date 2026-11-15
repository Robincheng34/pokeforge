/**
 * 从 pret 符号表生成 Gen2 训练家分组清单 JSON（bank 0e 的 *Group 标签）
 */
import * as fs from 'fs'

const sym = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/)
const groups: Array<{ label: string; bank: number; addr: number }> = []

for (const line of sym) {
  const m = line.match(/^([0-9a-fA-F]{2}):([0-9a-fA-F]{4}) (\S+)$/)
  if (!m) continue
  const [, bankHex, addrHex, name] = m
  const gm = name.match(/^([A-Za-z0-9_]+)Group$/) && !/^(TrainerGroups?)$/.test(name)
  if (gm && bankHex === '0e') {
    groups.push({ label: m[3], bank: parseInt(bankHex, 16), addr: parseInt(addrHex, 16) })
  }
}

groups.sort((a, b) => a.addr - b.addr || a.bank - b.bank)
console.log(`groups: ${groups.length}`)
fs.writeFileSync(process.argv[3], JSON.stringify(groups, null, 1))
