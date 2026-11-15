import * as fs from 'fs'
import { Rom } from '../src/core/rom'
const data = fs.readFileSync('F:/新建文件夹 (2)/Pokémon/Game Boy Color/口袋妖怪-银.gbc')
const rom = new Rom(data, 'gb')
const buf = rom.readBytes(0x4000, rom.size - 0x4000)
const SIG = Buffer.from('071021bd0000091121bd1000ff', 'hex')
let party = -1
for (let i = 0; i <= buf.length - SIG.length; i++) {
  if (buf[i] === SIG[0] && buf.subarray(i, i + SIG.length).equals(SIG)) { party = 0x4000 + i; break }
}
console.log('partyOffset:', party ? '0x' + party.toString(16) : '未找到')
let term = -1
for (let k = party - 2; k > party - 32 && k >= 0x4000; k--) {
  if (rom.readU8(k) === 0x50) { term = k; break }
}
console.log('terminator:', term ? '0x' + term.toString(16) : '无', 'bytes:', Array.from({length:8},(_,i)=>data[party-8+i].toString(16)).join(' '))
const groupStart = term + 1
const bank = Math.floor(groupStart / 0x4000)
const gbAddr = 0x4000 + (groupStart - bank * 0x4000)
console.log('groupStart: 0x' + groupStart.toString(16), 'bank:', bank, 'gbAddr: 0x' + gbAddr.toString(16))
// 直接检查已知表位置
console.log('已知表 @0x3993e 的 word:', (data[0x3993e] | (data[0x3993f] << 8)).toString(16))
const lo = gbAddr & 0xff, hi = (gbAddr >> 8) & 0xff
const hits = []
for (let i = 0x4000; i < rom.size - 200; i++) {
  if (data[i] === lo && data[i + 1] === hi) hits.push('0x' + i.toString(16))
}
console.log('word 命中:', hits.slice(0, 8).join(' '))
