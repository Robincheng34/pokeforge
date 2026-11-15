import * as fs from 'fs'
import { Rom } from '../src/core/rom'
import { openSav } from '../src/core/saveedit'
const rom = new Rom(fs.readFileSync('F:/新建文件夹 (2)/Pokémon/Game Boy Color/精灵宝可梦-水晶版/Pokemon_Crystal[T+Chi](V1.2).sav'), 'gb')
const info = openSav(rom)
console.log('party:', info.partyCount)
if (info.mons.length) console.log('mon0:', JSON.stringify(info.mons[0]))
