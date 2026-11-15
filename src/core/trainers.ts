/**
 * Gen2 训练家数据（结构对照 pokegold data/trainers/parties.asm，已在原版与汉化版 Silver 实测）：
 * 每个训练家条目：名字文本（任意字节，以 0x50 终止）→ 队伍类型字节 → 队伍（0xFF 结束）
 *   类型 0 NORMAL:      level, species
 *   类型 1 MOVES:       level, species, 4 moves
 *   类型 2 ITEM:        level, species, item
 *   类型 3 ITEM_MOVES:  level, species, item, 4 moves
 */
import { romMemo } from './cache'
import trainerGroups from './trainergroups.json'

export interface TrainerGroupRef {
  /** 分组标签（可缺省，编辑器内临时解析的组用 g+编号） */
  label?: string
  bank: number
  addr: number
}

export const TRAINER_GROUPS = trainerGroups as TrainerGroupRef[]

export const TRAINER_GROUP_NAMES: Record<string, string> = {
  FalknerGroup: '阿速（桔梗道馆）',
  WhitneyGroup: '小茜（满金道馆）',
  BugsyGroup: '阿吉（桧皮道馆）',
  MortyGroup: '松叶（缘朱道馆）',
  PryceGroup: '柳伯（卡吉道馆）',
  JasmineGroup: '阿蜜（浅黄道馆）',
  ChuckGroup: '阿四（湛蓝道馆）',
  ClairGroup: '小桩（烟墨道馆）',
  Rival1Group: '对手（前期）',
  Rival2Group: '对手（后期）',
  PokemonProfGroup: '宝可梦博士',
  PKMNTrainerGroup: '宝可梦训练家（龟仙人）',
  WillGroup: '一树（四天王1）',
  KogaGroup: '阿桔（四天王2）',
  BrunoGroup: '一也（四天王3）',
  KarenGroup: '梨花（四天王4）',
  LanceGroup: '渡（冠军）',
  ChampionGroup: '冠军（Final）',
  BrockGroup: '小刚（关都道馆）',
  MistyGroup: '小霞（关都道馆）',
  LtSurgeGroup: '马志士（关都道馆）',
  ErikaGroup: '莉佳（关都道馆）',
  JanineGroup: '阿杏（关都道馆）',
  SabrinaGroup: '娜姿（关都道馆）',
  BlaineGroup: '夏伯（关都道馆）',
  BlueGroup: '小茂（最后对战）',
  RedGroup: 'RED（真·最终对战）',
  YoungsterGroup: '短裤小子',
  SchoolboyGroup: '学生哥',
  BirdKeeperGroup: '鸟饲育家',
  LassGroup: '迷你裙',
  CooltrainerMGroup: '精英训练家♂',
  CooltrainerFGroup: '精英训练家♀',
  BeautyGroup: '美女',
  PokemaniacGroup: '宝可梦狂',
  GruntMGroup: '火箭队喽啰♂',
  GruntFGroup: '火箭队喽啰♀',
  ExecutiveMGroup: '火箭队干部♂',
  ExecutiveFGroup: '火箭队干部♀',
  GentlemanGroup: '绅士',
  SkierGroup: '滑雪者',
  TeacherGroup: '教师',
  ScientistGroup: '科学家',
  BugCatcherGroup: '捕虫少年',
  FisherGroup: '钓鱼客',
  SwimmerMGroup: '游泳选手♂',
  SwimmerFGroup: '游泳选手♀',
  SailorGroup: '水手',
  SuperNerdGroup: '超级书呆子',
  GuitaristGroup: '吉他手',
  HikerGroup: '登山男',
  BikerGroup: '暴走族',
  BurglarGroup: '怪盗',
  FirebreatherGroup: '喷火者',
  JugglerGroup: '杂耍艺人',
  BlackbeltGroup: '空手道王',
  PsychicGroup: '超能力者',
  PicnickerGroup: '野餐少女',
  CamperGroup: '露营少年',
  SageGroup: '僧侣',
  MediumGroup: '灵媒',
  BoarderGroup: '滑板少年',
  PokefanMGroup: '宝可梦迷♂',
  PokefanFGroup: '宝可梦迷♀',
  KimonoGirlGroup: '和服少女',
  TwinsGroup: '双胞胎',
  OfficerGroup: '警察'
}

export function trainerGroupName(label: string): string {
  return TRAINER_GROUP_NAMES[label] ?? label.replace(/Group$/, '')
}

export function gbGroupFileOffset(g: TrainerGroupRef): number {
  return g.bank * 0x4000 + (g.addr - 0x4000)
}

/**
 * 动态解析训练家分组指针表（金/银/水晶偏移不同，不能写死）：
 * 遍历全 ROM 的 2 字节值，把每个候选当作指针表首（= FALKNER 组的地址），
 * 校验方式：从该地址按组结构解析，队伍首字节必须匹配 Falkner 签名（7级波波带拍击/掷泥）。
 */
export interface ResolvedGroup {
  /** 类别编号（loadtrainer 字节里的组号，1 起） */
  num: number
  bank: number
  addr: number
  /** 该组指针在指针表中的文件偏移（2 字节 LE），用于整体搬迁分组后回填 */
  ptrOff?: number
}

const FALKNER_SIG = Buffer.from('071021bd0000091121bd1000ff', 'hex')
const GROUP_BANK = 0x0e

function groupFileOffset(ptr: number): number {
  return GROUP_BANK * 0x4000 + (ptr - 0x4000)
}

function tryParseGroupAt(rom: { readU8: (o: number) => number; size: number }, fileOff: number): boolean {
  let cur = fileOff
  // 名字直到 0x50（≤32）
  let len = 0
  while (cur < rom.size && rom.readU8(cur) !== 0x50 && len < 32) { cur++; len++ }
  if (len === 0 || len >= 32) return false
  cur++ // 0x50
  const type = rom.readU8(cur)
  if (type > 3) return false
  cur++
  // 队伍首字节必须匹配签名前 8 字节（lv7 species0x10 Tackle MudSlap 0 0 | lv9 species0x11）
  for (let k = 0; k < 8; k++) {
    if (rom.readU8(cur + k) !== FALKNER_SIG[k]) return false
  }
  return true
}

function resolveTrainerGroupsUncached(
  rom: { readU8: (o: number) => number; size: number }
): ResolvedGroup[] {
  for (let i = 0x4000; i < rom.size - 200; i++) {
    const ptr = rom.readU8(i) | (rom.readU8(i + 1) << 8)
    if (ptr < 0x4000 || ptr >= 0x8000) continue
    const next = rom.readU8(i + 2) | (rom.readU8(i + 3) << 8)
    if (next < 0x4000 || next >= 0x8000) continue
    if (!tryParseGroupAt(rom, groupFileOffset(ptr))) continue
    const tableOff = i
    const groups: ResolvedGroup[] = []
    for (let n = 0; n < 66; n++) {
      const p = rom.readU8(tableOff + n * 2) | (rom.readU8(tableOff + n * 2 + 1) << 8)
      if (p < 0x4000 || p >= 0x8000) break
      groups.push({ num: n + 1, bank: GROUP_BANK, addr: p, ptrOff: tableOff + n * 2 })
    }
    if (groups.length >= 60) return groups
  }
  return []
}

/** 训练家类别中文名（编号 = loadtrainer 字节组号，1 起） */
export const CLASS_NAMES_BY_NUM: Record<number, string> = {
  1: '阿速（桔梗道馆）', 2: '小茜（满金道馆）', 3: '阿吉（桧皮道馆）', 4: '松叶（缘朱道馆）',
  5: '柳伯（卡吉道馆）', 6: '阿蜜（浅黄道馆）', 7: '阿四（湛蓝道馆）', 8: '小桩（烟墨道馆）',
  9: '对手（前期）', 10: '空木博士', 11: '一树（四天王1）', 12: '克丽丝（电话对手）',
  13: '一也（四天王3）', 14: '梨花（四天王4）', 15: '阿桔（四天王2）', 16: '渡（冠军）',
  17: '小刚（关都道馆）', 18: '小霞（关都道馆）', 19: '马志士（关都道馆）', 20: '科学家',
  21: '莉佳（关都道馆）', 22: '短裤小子', 23: '学生哥', 24: '鸟饲育家',
  25: '迷你裙', 26: '阿杏（关都道馆）', 27: '精英训练家♂', 28: '精英训练家♀',
  29: '美女', 30: '宝可梦狂', 31: '火箭队喽啰♂', 32: '绅士',
  33: '滑雪者', 34: '教师', 35: '娜姿（关都道馆）', 36: '捕虫少年',
  37: '钓鱼客', 38: '游泳选手♂', 39: '游泳选手♀', 40: '水手',
  41: '超级书呆子', 42: '对手（后期）', 43: '吉他手', 44: '登山男',
  45: '暴走族', 46: '夏伯（关都道馆）', 47: '怪盗', 48: '喷火者',
  49: '杂耍艺人', 50: '空手道王', 51: '火箭队干部♂', 52: '超能力者',
  53: '野餐少女', 54: '露营少年', 55: '火箭队干部♀', 56: '僧侣',
  57: '灵媒', 58: '滑板少年', 59: '宝可梦迷♂', 60: '和服少女',
  61: '双胞胎', 62: '宝可梦迷♀', 63: 'RED（真·最终对战）', 64: '小茂（最后对战）',
  65: '警察', 66: '火箭队喽啰♀'
}

/**
 * 剧情进度顺序（金/银/水晶流程）：
 * 对手开局 → 城都各道馆与其沿途训练家 → 火箭队事件 → 对手后期 → 四天王/冠军 → 关都道馆 → RED
 * 编号 = 类别号；未列出的类别排在最后。
 */
export const STORY_ORDER_NUMS: number[] = [
  9, 10, 1, 22, 36, 2, 23, 25, 24, 37, 3, 44, 41, 4, 27, 28, 30, 52, 53, 54, 61, 60,
  7, 50, 6, 32, 40, 5, 33, 58, 8,
  31, 66, 51, 55, 20, 42,
  11, 15, 13, 14, 16,
  17, 18, 19, 21, 26, 35, 46, 64, 63,
  43, 49, 48, 47, 45, 39, 38, 29, 59, 62, 65, 12
]

export const TRAINERTYPE_NAMES: Record<number, string> = {
  0: '普通',
  1: '带招式',
  2: '带道具',
  3: '道具+招式'
}

export interface TrainerMon {
  level: number
  species: number
  item?: number
  moves?: number[]
  /** 各字段文件偏移（用于编辑） */
  off: { level: number; species: number; item?: number; moves?: number[] }
}

export interface TrainerEntry {
  /** 名字字节区间（含结尾 0x50），汉化版里是汉字编码，无法解码显示 */
  nameOffset: number
  nameLength: number
  type: number
  typeOffset: number
  partyOffset: number
  mons: TrainerMon[]
  endOffset: number
}

export interface TrainerGroupData {
  ref: TrainerGroupRef
  offset: number
  trainers: TrainerEntry[]
}

/** 解析一个训练家分组。endOffset = 分组结束边界（下一个分组的起始文件偏移），防止越界滑入后续分组 */
export function readTrainerGroup(
  rom: { readU8: (o: number) => number; size: number },
  g: TrainerGroupRef,
  maxTrainers = 20,
  endOffset?: number
): TrainerGroupData {
  const offset = gbGroupFileOffset(g)
  const limit = Math.min(endOffset ?? rom.size, rom.size)
  const trainers: TrainerEntry[] = []
  let cur = offset
  for (let n = 0; n < maxTrainers && cur < limit - 8; n++) {
    const nameOffset = cur
    // 名字直到 0x50
    let nameLen = 0
    while (cur < limit && rom.readU8(cur) !== 0x50 && nameLen < 32) {
      cur++
      nameLen++
    }
    if (cur >= limit || nameLen >= 32 || nameLen < 3) break // 名字至少 1 个汉字(2字节)+终止符，过滤组间指针数组误解析
    cur++ // 跳过 0x50
    nameLen++
    const type = rom.readU8(cur)
    const typeOffset = cur
    if (type > 3) break
    cur++
    const mons: TrainerMon[] = []
    const partyOffset = cur
    let ok = true
    for (let m = 0; m < 6; m++) {
      if (cur >= limit) { ok = false; break }
      const level = rom.readU8(cur)
      if (level === 0xff) break
      const species = rom.readU8(cur + 1)
      if (species === 0x00 || species > 0xff) { ok = false; break }
      const mon: TrainerMon = {
        level, species,
        off: { level: cur, species: cur + 1 }
      }
      cur += 2
      if (type === 2 || type === 3) {
        mon.item = rom.readU8(cur)
        mon.off.item = cur
        cur++
      }
      if (type === 1 || type === 3) {
        mon.moves = []
        mon.off.moves = []
        for (let k = 0; k < 4; k++) {
          mon.moves.push(rom.readU8(cur))
          mon.off.moves!.push(cur)
          cur++
        }
      }
      if (mon.level === 0 || mon.level > 100) { ok = false; break }
      mons.push(mon)
    }
    if (!ok || mons.length === 0 || cur >= limit || rom.readU8(cur) !== 0xff) break
    const endOffset = cur
    cur++ // 0xFF
    trainers.push({ nameOffset, nameLength: nameLen, type, typeOffset, partyOffset, mons, endOffset })
  }
  return { ref: g, offset, trainers }
}

export function writeTrainerField(
  rom: { writeU8: (o: number, v: number) => void },
  mon: TrainerMon,
  field: 'level' | 'species' | 'item' | 'move',
  value: number,
  moveIndex?: number
): void {
  if (field === 'level') rom.writeU8(mon.off.level, value)
  else if (field === 'species') rom.writeU8(mon.off.species, value)
  else if (field === 'item' && mon.off.item !== undefined) rom.writeU8(mon.off.item, value)
  else if (field === 'move' && mon.off.moves && moveIndex !== undefined) rom.writeU8(mon.off.moves[moveIndex], value)
  else throw new Error('该训练家类型不支持此字段')
}

// ---- TM/HM 兼容位（BaseStats +0x18..0x1F，8 字节 64 位） ----
export const TM_MOVES: Array<{ id: number; move: string; zh: string }> = [
  { id: 1, move: 'DYNAMICPUNCH', zh: '爆裂拳' }, { id: 2, move: 'HEADBUTT', zh: '头锤' },
  { id: 3, move: 'CURSE', zh: '诅咒' }, { id: 4, move: 'ROLLOUT', zh: '滚动' },
  { id: 5, move: 'ROAR', zh: '吼叫' }, { id: 6, move: 'TOXIC', zh: '剧毒' },
  { id: 7, move: 'ZAP_CANNON', zh: '电磁炮' }, { id: 8, move: 'ROCK_SMASH', zh: '碎岩' },
  { id: 9, move: 'PSYCH_UP', zh: '意念头锤' }, { id: 10, move: 'HIDDEN_POWER', zh: '觉醒力量' },
  { id: 11, move: 'SUNNY_DAY', zh: '大晴天' }, { id: 12, move: 'SWEET_SCENT', zh: '甜甜香气' },
  { id: 13, move: 'SNORE', zh: '打鼾' }, { id: 14, move: 'BLIZZARD', zh: '暴风雪' },
  { id: 15, move: 'HYPER_BEAM', zh: '破坏光线' }, { id: 16, move: 'ICY_WIND', zh: '冰冻之风' },
  { id: 17, move: 'PROTECT', zh: '守住' }, { id: 18, move: 'RAIN_DANCE', zh: '求雨' },
  { id: 19, move: 'GIGA_DRAIN', zh: '终极吸取' }, { id: 20, move: 'ENDURE', zh: '忍耐' },
  { id: 21, move: 'FRUSTRATION', zh: '迁怒' }, { id: 22, move: 'SOLARBEAM', zh: '日光束' },
  { id: 23, move: 'IRON_TAIL', zh: '铁尾' }, { id: 24, move: 'DRAGONBREATH', zh: '龙息' },
  { id: 25, move: 'THUNDER', zh: '打雷' }, { id: 26, move: 'EARTHQUAKE', zh: '地震' },
  { id: 27, move: 'RETURN', zh: '报恩' }, { id: 28, move: 'DIG', zh: '挖洞' },
  { id: 29, move: 'PSYCHIC_M', zh: '精神强念' }, { id: 30, move: 'SHADOW_BALL', zh: '暗影球' },
  { id: 31, move: 'MUD_SLAP', zh: '掷泥' }, { id: 32, move: 'DOUBLE_TEAM', zh: '最小化变身' },
  { id: 33, move: 'ICE_PUNCH', zh: '冰冻拳' }, { id: 34, move: 'SWAGGER', zh: '虚张声势' },
  { id: 35, move: 'SLEEP_TALK', zh: '梦话' }, { id: 36, move: 'SLUDGE_BOMB', zh: '污泥炸弹' },
  { id: 37, move: 'SANDSTORM', zh: '沙暴' }, { id: 38, move: 'FIRE_BLAST', zh: '大字爆炎' },
  { id: 39, move: 'SWIFT', zh: '高速星星' }, { id: 40, move: 'DEFENSE_CURL', zh: '缩成一团' },
  { id: 41, move: 'THUNDERPUNCH', zh: '雷电拳' }, { id: 42, move: 'DREAM_EATER', zh: '食梦' },
  { id: 43, move: 'DETECT', zh: '看穿' }, { id: 44, move: 'REST', zh: '睡觉' },
  { id: 45, move: 'ATTRACT', zh: '魅惑之声' }, { id: 46, move: 'THIEF', zh: '小偷' },
  { id: 47, move: 'STEEL_WING', zh: '钢翼' }, { id: 48, move: 'FIRE_PUNCH', zh: '火焰拳' },
  { id: 49, move: 'FURY_CUTTER', zh: '连斩' }, { id: 50, move: 'NIGHTMARE', zh: '恶梦' },
  { id: 51, move: 'CUT', zh: '居合斩（HM01）' }, { id: 52, move: 'FLY', zh: '飞翔（HM02）' },
  { id: 53, move: 'SURF', zh: '冲浪（HM03）' }, { id: 54, move: 'STRENGTH', zh: '怪力（HM04）' },
  { id: 55, move: 'FLASH', zh: '闪光（HM05）' }, { id: 56, move: 'WATERFALL', zh: '攀瀑（HM06）' },
  { id: 57, move: 'WHIRLPOOL', zh: '潮旋（HM07）' }
]

/** 读取宝可梦的 TM/HM 兼容位（baseStats 表内 +0x18 起 8 字节） */
export function readTMHMBits(
  rom: { readU8: (o: number) => number },
  tableOffset: number, entrySize: number, firstId: number, id: number
): boolean[] {
  const base = tableOffset + (id - firstId) * entrySize + 0x18
  const bits: boolean[] = []
  for (let n = 0; n < 57; n++) {
    const byte = rom.readU8(base + (n >> 3))
    bits.push((byte >> (n & 7)) & 1 ? true : false)
  }
  return bits
}

export function writeTMHMBit(
  rom: { readU8: (o: number) => number; writeU8: (o: number, v: number) => void },
  tableOffset: number, entrySize: number, firstId: number, id: number, tmIndex: number, on: boolean
): void {
  const base = tableOffset + (id - firstId) * entrySize + 0x18
  const byteOff = base + (tmIndex >> 3)
  const mask = 1 << (tmIndex & 7)
  const cur = rom.readU8(byteOff)
  rom.writeU8(byteOff, on ? cur | mask : cur & ~mask)
}

// ---- 无视兼容位补丁：把 CanLearnTMHMMove 的兼容检查改为恒返回“可学习” ----
// 例程签名（pokegold engine/items/tmhm2.asm .found 分支，金/银/水晶及汉化版实测一致）：
//   pop hl(e1) ld b,CHECK_FLAG(06 02) push de(d5) ld d,0(16 00) ld a,id(3e XX) call Predef(cd XX XX) pop de(d1) ret(c9)
// 补丁：把 ld a,id + call Predef（5 字节）替换为 ld c,1(0e 01) ret(c9) nop(00 00)

export function findTMCompatCheck(
  rom: { readU8: (o: number) => number; size: number }
): number | null {
  for (let i = 0x4000; i < rom.size - 16; i++) {
    if (
      rom.readU8(i) === 0x06 && rom.readU8(i + 1) === 0x02 &&
      rom.readU8(i + 2) === 0xd5 && rom.readU8(i + 3) === 0x16 && rom.readU8(i + 4) === 0x00 &&
      rom.readU8(i + 5) === 0x3e && rom.readU8(i + 7) === 0xcd &&
      rom.readU8(i + 10) === 0xd1 && rom.readU8(i + 11) === 0xc9
    ) return i
  }
  return null
}

export function isTMCompatPatched(
  rom: { readU8: (o: number) => number }, offset: number
): boolean {
  // 补丁特征: 0e 01 c9
  return rom.readU8(offset + 5) === 0x0e && rom.readU8(offset + 6) === 0x01 && rom.readU8(offset + 7) === 0xc9
}

export function setTMCompatIgnored(
  rom: { writeU8: (o: number, v: number) => void },
  offset: number,
  ignore: boolean
): void {
  if (ignore) {
    // ld c,1 ; ret ; nop ; nop
    rom.writeU8(offset + 5, 0x0e)
    rom.writeU8(offset + 6, 0x01)
    rom.writeU8(offset + 7, 0xc9)
    rom.writeU8(offset + 8, 0x00)
    rom.writeU8(offset + 9, 0x00)
  }
  // 解除补丁用「单条复原」（原始快照保存了补丁前字节）
}

export function resolveTrainerGroups(rom: Parameters<typeof resolveTrainerGroupsUncached>[0]) {
  return romMemo(rom, 'trainerGroups', () => resolveTrainerGroupsUncached(rom))
}

// ---- 训练家分组格式转换（普通 → 带招式） ----
// 金/银引擎（read_trainer_party.asm）从 TrainerGroups 指针表取组首地址后顺序遍历
// （数 0xFF 终止符跳过前面的训练家），组内没有独立指针 → 整组重建+搬迁是安全的，
// 只需回填 TrainerGroups 指针表的 2 字节地址。
export interface LearnsetMove { level: number; move: number }

/** 该等级实际会学的 4 个招式（升级表取 level≤当前等级的最后 4 个，不足补 0） */
export function defaultMovesAt(learns: LearnsetMove[], level: number): number[] {
  const known = learns.filter((l) => l.level <= level).slice(-4).map((l) => l.move)
  while (known.length < 4) known.push(0)
  return known.slice(0, 4)
}

function entryBytes(rom: { readU8: (o: number) => number }, e: TrainerEntry): number[] {
  const out: number[] = []
  for (let i = e.nameOffset; i <= e.endOffset; i++) out.push(rom.readU8(i))
  return out
}

/**
 * 把分组里第 entryIdx（0 起）个训练家转为“带招式”格式（原为普通格式时），
 * 默认招式按升级表在对应等级应会的最后 4 个填入。
 * 优先原位扩展（组尾不越过下一分组边界），放不下则整组搬迁到本 bank 的空闲区并回填指针。
 * 返回 'inplace' | 'relocated' | null（null = 失败）
 */
export function convertTrainerToMoves(
  rom: { readU8: (o: number) => number; writeU8: (o: number, v: number) => void; size: number },
  g: TrainerGroupRef,
  entryIdx: number,
  boundary: number, // 下一分组的文件偏移（组数据上界）
  learnsetOf: (species: number) => LearnsetMove[]
): 'inplace' | 'relocated' | null {
  const data = readTrainerGroup(rom, g, 40, boundary)
  if (entryIdx < 0 || entryIdx >= data.trainers.length) return null
  const target = data.trainers[entryIdx]
  if (target.type === 1 || target.type === 3) return null // 已是带招式格式

  // 重建整组字节：目标训练家的每只宝可梦追加 4 个招式字节
  const bytes: number[] = []
  for (let i = 0; i < data.trainers.length; i++) {
    const e = data.trainers[i]
    if (i !== entryIdx) { bytes.push(...entryBytes(rom, e)); continue }
    // 名字（含 0x50）
    for (let k = e.nameOffset; k < e.nameOffset + e.nameLength; k++) bytes.push(rom.readU8(k))
    bytes.push(1) // TRAINERTYPE_MOVES
    for (const mon of e.mons) {
      bytes.push(mon.level, mon.species)
      if (e.type === 2 || e.type === 3) bytes.push(mon.item ?? 0)
      bytes.push(...defaultMovesAt(learnsetOf(mon.species), mon.level))
    }
    bytes.push(0xff)
  }

  const groupStart = gbGroupFileOffset(g)
  const ref = data.ref as TrainerGroupRef & { bank: number }
  const bank = ref.bank
  const bankFileBase = bank * 0x4000
  const bankFileEnd = bankFileBase + 0x4000

  if (groupStart + bytes.length <= boundary) {
    // 原位扩展
    bytes.forEach((b, k) => rom.writeU8(groupStart + k, b))
    return 'inplace'
  }

  // 整组搬迁：在本 bank 找足够长的空闲区（0xFF 或 0x00 填充，避开所有分组数据区与指针表）
  const occupied = data.trainers.map((e) => ({ a: e.nameOffset, b: e.endOffset }))
  occupied.push({ a: groupStart, b: groupStart + bytes.length })
  for (let start = bankFileBase; start + bytes.length <= bankFileEnd; start++) {
    let ok = true
    for (let k = 0; k < bytes.length; k++) {
      const o = start + k
      const b = rom.readU8(o)
      if (b !== 0xff && b !== 0x00) { ok = false; break }
      if (occupied.some((r) => o >= r.a && o <= r.b)) { ok = false; break }
    }
    if (!ok) continue
    bytes.forEach((b, k) => rom.writeU8(start + k, b))
    // 回填指针（2 字节 LE，组内地址 = 0x4000 + 文件偏移-bank基址）
    const ptrOff = (g as ResolvedGroup).ptrOff
    if (ptrOff === undefined) return null
    const addr = 0x4000 + (start - bankFileBase)
    rom.writeU8(ptrOff, addr & 0xff)
    rom.writeU8(ptrOff + 1, addr >> 8)
    return 'relocated'
  }
  return null
}

// ---- Gen1 TM/HM（pokered constants/move_constants.asm：TM01=破裂拳(5)…TM50=替身(164)，HM01 居合斩(15)…HM05 闪光(148)）----
export interface Gen1TMHM { id: number; moveId: number; zh: string }
export const TM_MOVES_GEN1: Gen1TMHM[] = [...[{"id":1,"moveId":5,"zh":"TM01"},{"id":2,"moveId":13,"zh":"TM02"},{"id":3,"moveId":14,"zh":"TM03"},{"id":4,"moveId":18,"zh":"TM04"},{"id":5,"moveId":25,"zh":"TM05"},{"id":6,"moveId":92,"zh":"TM06"},{"id":7,"moveId":32,"zh":"TM07"},{"id":8,"moveId":34,"zh":"TM08"},{"id":9,"moveId":36,"zh":"TM09"},{"id":10,"moveId":38,"zh":"TM10"},{"id":11,"moveId":61,"zh":"TM11"},{"id":12,"moveId":55,"zh":"TM12"},{"id":13,"moveId":58,"zh":"TM13"},{"id":14,"moveId":59,"zh":"TM14"},{"id":15,"moveId":63,"zh":"TM15"},{"id":16,"moveId":6,"zh":"TM16"},{"id":17,"moveId":66,"zh":"TM17"},{"id":18,"moveId":68,"zh":"TM18"},{"id":19,"moveId":69,"zh":"TM19"},{"id":20,"moveId":99,"zh":"TM20"},{"id":21,"moveId":72,"zh":"TM21"},{"id":22,"moveId":76,"zh":"TM22"},{"id":23,"moveId":82,"zh":"TM23"},{"id":24,"moveId":85,"zh":"TM24"},{"id":25,"moveId":87,"zh":"TM25"},{"id":26,"moveId":89,"zh":"TM26"},{"id":27,"moveId":90,"zh":"TM27"},{"id":28,"moveId":91,"zh":"TM28"},{"id":29,"moveId":94,"zh":"TM29"},{"id":30,"moveId":100,"zh":"TM30"},{"id":31,"moveId":102,"zh":"TM31"},{"id":32,"moveId":104,"zh":"TM32"},{"id":33,"moveId":115,"zh":"TM33"},{"id":34,"moveId":117,"zh":"TM34"},{"id":35,"moveId":118,"zh":"TM35"},{"id":36,"moveId":120,"zh":"TM36"},{"id":37,"moveId":121,"zh":"TM37"},{"id":38,"moveId":126,"zh":"TM38"},{"id":39,"moveId":129,"zh":"TM39"},{"id":40,"moveId":130,"zh":"TM40"},{"id":41,"moveId":135,"zh":"TM41"},{"id":42,"moveId":138,"zh":"TM42"},{"id":43,"moveId":143,"zh":"TM43"},{"id":44,"moveId":156,"zh":"TM44"},{"id":45,"moveId":86,"zh":"TM45"},{"id":46,"moveId":149,"zh":"TM46"},{"id":47,"moveId":153,"zh":"TM47"},{"id":48,"moveId":157,"zh":"TM48"},{"id":49,"moveId":161,"zh":"TM49"},{"id":50,"moveId":164,"zh":"TM50"}], ...[{"id":51,"moveId":15,"zh":"HM01"},{"id":52,"moveId":19,"zh":"HM02"},{"id":53,"moveId":57,"zh":"HM03"},{"id":54,"moveId":70,"zh":"HM04"},{"id":55,"moveId":148,"zh":"HM05"}]]
