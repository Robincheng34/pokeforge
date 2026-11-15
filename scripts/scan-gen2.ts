/**
 * 扫描定位 Gen2 BaseStats 表（用 Bulbasaur 字节签名）
 * Gen2 Bulbasaur: dex=01 HP=45 Atk=49 Def=49 Spd=45 SpA=65 SpD=65 type1=GRASS(13) type2=GRASS(13) catch=45
 */
import * as fs from 'fs'

const FILES = [
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-金.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪 - 水晶 (简) .gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy/Pokémon-Red.gbc',
  'F:/新建文件夹 (2)/Pokémon/Game Boy/Pokémon-Pika.gbc'
]

// Gen2: 01 2D 31 31 2D 41 41 0D 0D 2D
const SIG_GEN2 = Buffer.from('012d31312d41410d0d2d', 'hex')
// Gen1: dex=01 HP=45 Atk=49 Def=49 Spd=45 Spc=65 type1=GRASS(13) type2=POISON(3) catch=45 baseexp=64
const SIG_GEN1 = Buffer.from('012d31312d410d032d64', 'hex')

for (const f of FILES) {
  const data = fs.readFileSync(f)
  console.log(`\n=== ${f.split('/').pop()} (${data.length} bytes) ===`)
  for (const [name, sig] of [['Gen2', SIG_GEN2], ['Gen1', SIG_GEN1]] as const) {
    const hits: number[] = []
    for (let i = 0; i <= data.length - sig.length; i++) {
      if (data[i] === sig[0] && data.subarray(i, i + sig.length).equals(sig)) hits.push(i)
    }
    console.log(`  ${name} 签名命中 ${hits.length} 处: ${hits.slice(0, 8).map((h) => '0x' + h.toString(16)).join(', ')}`)
    // 输出每处命中后续几个字节，判断是否紧接真实表（Ivysaur dex=02 应在 +32/+28 处）
    for (const h of hits.slice(0, 3)) {
      console.log(`    @0x${h.toString(16)} 后续 64B: ${data.subarray(h, h + 64).toString('hex').match(/.{2}/g)!.slice(0, 32).join(' ')}`)
    }
  }
}
