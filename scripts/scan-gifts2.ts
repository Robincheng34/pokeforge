import * as fs from 'fs'
const silver = fs.readFileSync('F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc')
for (const [n, sigHex] of [['伊布lv20', '2d85140000'], ['巴尔郎lv10', '2decca0000'], ['烈雀+信', '2d400a0001'], ['阿布拉?lv10', '2d3f0a0000']] as const) {
  const s = Buffer.from(sigHex, 'hex')
  const hits: number[] = []
  for (let i = 0x4000; i <= silver.length - s.length; i++) {
    let ok = true
    for (let k = 0; k < s.length; k++) if (silver[i + k] !== s[k]) { ok = false; break }
    if (ok) hits.push(i)
  }
  console.log(n, hits.length, hits.slice(0, 4).map((h) => '0x' + h.toString(16)).join(' '))
}
