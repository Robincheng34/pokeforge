/**
 * 按 Gen2 道具 ID 重建真实使用功能说明
 */
import * as fs from 'fs'
const zh = JSON.parse(fs.readFileSync('src/core/gen2-items-zh.json', 'utf8')) as Record<number, string>

const OVERRIDE: Record<number, string> = {
  1: '投掷后必定捕捉野生宝可梦',
  2: '投掷捕捉，捕捉率 ×2',
  3: '（亮粉：携带后降低被命中率，无使用效果）',
  4: '投掷捕捉，捕捉率 ×1.5',
  5: '投掷捕捉，标准捕捉率',
  6: '打开城镇地图',
  7: '骑自行车（移动速度加倍）',
  23: '投掷捕捉，皮卡丘系捕捉率更高？（雷之石另作进化用）'
}
void OVERRIDE

function autoFunction(id: number, name: string): string {
  if (/球$/.test(name) && !/玩偶|尾巴/.test(name)) {
    if (id === 1) return '投掷后必定捕捉野生宝可梦'
    if (id === 2) return '投掷捕捉，捕捉率 ×2'
    if (id === 4) return '投掷捕捉，捕捉率 ×1.5'
    if (id === 5) return '投掷捕捉，标准捕捉率'
    if (id === 6) return '打开城镇地图'
    if (id === 7) return '骑自行车（移动速度加倍）'
    return '投掷捕捉宝可梦'
  }
  if (/伤药/.test(name)) {
    if (id === 17) return '回复 50 HP'
    if (id === 16) return '回复 200 HP'
    return '回复 20 HP'
  }
  if (name === '全满药') return 'HP 全回复 + 治愈全部异常'
  if (name === '全复药') return '治愈全部异常状态'
  if (name === '活力碎片' || name === '活力块') return '复活濒死宝可梦并回复 HP'
  if (name === '万灵药') return '复活濒死宝可梦，回复一半 HP'
  if (/解毒药|解毒树果/.test(name)) return '治愈中毒'
  if (/灼伤药|解灼伤/.test(name)) return '治愈灼伤'
  if (/解冻药|解冻树果/.test(name)) return '治愈冰冻'
  if (/解眠药|解睡眠/.test(name)) return '治愈睡眠'
  if (/解麻药|解麻树果/.test(name)) return '治愈麻痹'
  if (/神奇树果/.test(name)) return '治愈混乱'
  if (/万能粉|复活草/.test(name)) return '治愈全部异常（味道苦，降低亲密度）'
  if (name === '元气粉') return '回复 50 HP（味道苦，降低亲密度）'
  if (name === '元气根') return '回复 120 HP（味道苦，降低亲密度）'
  if (name === '哞哞鲜奶') return '回复 100 HP'
  if (name === '美味之水') return '回复 30 HP'
  if (name === '劲爽汽水') return '回复 50 HP'
  if (name === '果汁牛奶') return '回复 80 HP'
  if (/增强剂$/.test(name)) {
    const m: Record<string, string> = { HP: 'HP 努力值 +10', 攻击: '攻击努力值 +10', 防御: '防御努力值 +10', 速度: '速度努力值 +10', 特攻: '特攻努力值 +10', 特防: '特防努力值 +10' }
    for (const k of Object.keys(m)) if (name.includes(k)) return m[k]
  }
  if (name === '神奇糖果') return '直接提升 1 个等级'
  if (name === 'ＰＰ提升剂') return '单个招式最大 PP +20%'
  if (name === 'ＰＰ极限提升剂') return '单个招式最大 PP 提升至满'
  if (name === 'ＰＰ单项小补剂') return '回复单个招式 10 点 PP'
  if (name === 'ＰＰ单项全补剂') return '回复单个招式全部 PP'
  if (name === 'ＰＰ多项小补剂') return '回复全部招式各 10 点 PP'
  if (name === 'ＰＰ多项全补剂') return '回复全部招式的全部 PP'
  if (/进化石$|之石$/.test(name)) return '让特定宝可梦进化'
  if (name === '皮皮玩偶') return '投掷后必定从野生战斗逃走'
  if (name === '离洞绳') return '走出洞窟等迷宫（一次性）'
  if (name === '圣灰') return '复活全队濒死宝可梦并全回复'
  if (/喷雾$/.test(name)) return '一定步数内降低野生遇敌率'
  if (/玻璃哨$/.test(name)) return '吹奏治愈对应状态（可对队友使用）'
  if (name === '国王徽章' || name === '王者之证') return '让特定宝可梦携带后通信进化'
  if (name === '金属膜') return '让特定宝可梦携带后通信进化 / 钢系威力 +20%'
  if (name === '龙之鳞片' || name === '龙鳞') return '让特定宝可梦携带后通信进化'
  if (name === '升级数据' || name === '升级零件') return '让特定宝可梦携带后通信进化（波克比? 多边兽）'
  if (/邮件$/.test(name)) return '信纸道具（写邮件给朋友）'
  if (name === '愤怒馒头') return '使用后提升亲密度？'
  if (name === '狂暴基因') return '战斗中攻击最大化（历史遗留道具）'
  if (/碎片$|蘑菇$|珍珠$/.test(name)) return '收集品，出售换取金钱'
  if (/球果$/.test(name)) return '给柏树镇的球果佬制作特殊球'
  if (/星星沙|星星碎/.test(name)) return '收集品，出售换取金钱'
  if (name === '砖块碎片') return '收集品'
  if (/未使用/.test(name) || name === '（无）') return '未使用'
  if (name.includes('关键') || name.includes('剧情') || name.includes('门') || name.includes('证') || name.includes('票') || name.includes('自行车') || name.includes('地图') || name.includes('仪') || name.includes('壶') || name.includes('盒') || name.includes('钓鱼')) return '关键道具'
  return '收集品 / 特殊用途'
}

const out: Record<number, string> = {}
for (const [id, name] of Object.entries(zh)) {
  const num = +id
  out[num] = OVERRIDE[num] ?? autoFunction(num, name)
}
// 已知修正
out[23] = '让特定宝可梦进化（皮卡丘 → 雷丘）'
out[0x50] = 'HP 全回复'
out[0x10] = '回复 200 HP（厉害伤药）'
out[0x11] = '回复 50 HP（好伤药）'
out[0x12] = '回复 20 HP（伤药）'
out[0x0f] = 'HP 全回复（全满药）'
out[0x0e] = '治愈全部异常状态（全复药）'
fs.writeFileSync('src/core/gen2-item-functions.json', JSON.stringify(out))
console.log('功能说明已生成:', Object.keys(out).length, '项')
console.log('样例:', out[23], '|', out[18], '|', out[83], '|', out[0x0f])
