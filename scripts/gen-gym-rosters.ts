/**
 * 从 pokegold 源码生成各道馆的人物花名册 JSON
 * 输入: 解压的 pokegold-master 目录
 * 输出: src/core/gym-rosters.json — [{map, cn, roster:[{group, id, class, name}]}]
 */
import * as fs from 'fs'
import * as path from 'path'

const root = process.argv[2]
const outPath = process.argv[3]

// 1. 类别索引 + 每类别的人物序号表（trainer_constants.asm）
const tc = fs.readFileSync(path.join(root, 'constants/trainer_constants.asm'), 'utf8')
const classIndex: Record<string, number> = {}
const trainerId: Record<string, number> = {} // 'CLASS.NAME' -> id
let curClass = ''
let curClassNum = -1
let curTrainer = 0
for (const line of tc.split(/\r?\n/)) {
  const cm = line.match(/trainerclass ([A-Z_0-9]+) ; \$?([0-9A-Fa-f]+)/)
  if (cm) {
    if (curClass) trainerId[curClass + '.END'] = curTrainer
    curClass = cm[1]
    curClassNum = parseInt(cm[2], 16)
    classIndex[cm[1]] = curClassNum
    curTrainer = 0
    continue
  }
  const tm = line.match(/^\tconst ([A-Z_0-9]+)$/)
  if (tm && curClass) {
    curTrainer++
    trainerId[curClass + '.' + tm[1]] = curTrainer
  }
}

// 2. 道馆地图清单与中文名
const GYMS: Array<[string, string]> = [
  ['VioletGym', '桔梗道馆'], ['AzaleaGym', '桧皮道馆'], ['GoldenrodGym', '满金道馆'],
  ['EcruteakGym', '缘朱道馆'], ['OlivineGym', '浅黄道馆'], ['CianwoodGym', '湛蓝道馆'],
  ['MahoganyGym', '卡吉道馆'], ['BlackthornGym1F', '烟墨道馆1F'], ['BlackthornGym2F', '烟墨道馆2F'],
  ['PewterGym', '尼比道馆（关都）'], ['CeruleanGym', '华蓝道馆（关都）'], ['VermilionGym', '枯叶道馆（关都）'],
  ['CeladonGym', '玉虹道馆（关都）'], ['FuchsiaGym', '浅红道馆（关都）'], ['SaffronGym', '金黄道馆（关都）'],
  ['ViridianGym', '常磐道馆（关都）'], ['SeafoamGym', '双子岛道馆（关都）']
]

const result: Array<{ map: string; cn: string; roster: Array<{ group: number; id: number; label: string }> }> = []

for (const [map, cn] of GYMS) {
  const file = path.join(root, 'maps', map + '.asm')
  if (!fs.existsSync(file)) { console.log('跳过(文件不存在):', map); continue }
  const content = fs.readFileSync(file, 'utf8')
  const roster: Array<{ group: number; id: number; label: string }> = []
  // loadtrainer GROUP, ID
  for (const m of content.matchAll(/loadtrainer ([A-Z_0-9]+), ([A-Z_0-9]+)/g)) {
    const cls = m[1]
    const name = m[2]
    const g = classIndex[cls]
    const id = trainerId[cls + '.' + name]
    if (g !== undefined && id !== undefined) roster.push({ group: g, id, label: `${cls}.${name}` })
  }
  // trainer CLASS, NAME（对象事件）
  for (const m of content.matchAll(/^\ttrainer ([A-Z_0-9]+), ([A-Z_0-9]+),/gm)) {
    const cls = m[1]
    const name = m[2]
    const key = cls + '.' + name
    if (roster.some((r) => r.label === key)) continue
    const g = classIndex[cls]
    const id = trainerId[key]
    if (g !== undefined && id !== undefined) roster.push({ group: g, id, label: key })
  }
  result.push({ map, cn, roster })
  console.log(`${cn} (${map}): ${roster.length} 人 ->`, roster.map((r) => `组${r.group}#${r.id}`).join(' '))
}

fs.writeFileSync(outPath, JSON.stringify(result, null, 1))
