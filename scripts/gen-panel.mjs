import fs from 'fs'
let s = fs.readFileSync('src/renderer/src/components/SaveEditorPanel.tsx', 'utf8')
// 找到 return ( 的位置和文件结尾，提取 return 之前的所有内容
const returnIdx = s.indexOf('  return (\n    <div>')
if (returnIdx === -1) { console.log('return NOT FOUND'); process.exit(1) }
const preReturn = s.substring(0, returnIdx)
// 提取当前 return 里的各个区块
const ret = s.substring(returnIdx)
// 按标签找区块边界
function findBlock(tag) {
  const comment = '      {/* ---- ' + tag + ' ---- */}'
  const start = ret.indexOf(comment)
  if (start === -1) return null
  return { start, comment }
}
const playerC = findBlock('人物信息卡')
const bagC = findBlock('背包')
const pcC = findBlock('PC 盒子')
const teamC = findBlock('队伍宝可梦')
console.log('found blocks:', JSON.stringify({playerC, bagC, pcC, teamC}))
// 在 preReturn 后追加缓存导入
if (!preReturn.includes("romMemo")) {
  // 在 imports 后加缓存（render 内的 findGifts/findItemEffects 等已被 romMemo 包装）
}
// 输出：保持 return 前的部分 + 新的 return（按新顺序排列）
// 由于区块都在同一个 return 里，只需要重排 return 内部的顺序
const retStart = returnIdx
const retBody = ret
// 提取各区块的内容（到下一个区块注释为止）
function extractBlock(fromTag, toTag) {
  const from = ret.indexOf('      {/* ---- ' + fromTag + ' ---- */}')
  const to = toTag ? ret.indexOf('      {/* ---- ' + toTag + ' ---- */}') : ret.length
  if (from === -1 || to === -1) return ''
  return ret.substring(from, to)
}
const playerB = extractBlock('人物信息卡', '背包')
const bagB = extractBlock('背包', 'PC 盒子')
const pcB = extractBlock('PC 盒子', '队伍宝可梦')
const teamB = extractBlock('队伍宝可梦', null)
// 重排
const newRet = `  return (\n    <div>\n${playerB}${bagB}${pcB}${teamB}    </div>\n  )\n}\n`
fs.writeFileSync('src/renderer/src/components/SaveEditorPanel.tsx', preReturn + newRet)
console.log('Done, file length:', preReturn.length + newRet.length)
