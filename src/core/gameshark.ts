/**
 * GameShark / 金手指代码库（按世代 + 版本）
 * 代码均来自社区广泛验证的公开列表（Bulbapedia / GameFAQs / GlitchCity Archives）。
 * XX 占位 = 需要替换为十六进制值。
 * 注意：日版与汉化版 ROM 的 WRAM 地址可能不同，标注"英文版"的代码对日版/汉化版无效。
 * 3DS VC 版内置金手指功能对这些代码兼容性较好（Gen1/Gen2 VC 均可）。
 */
export interface GsCode {
  name: string
  code: string // 单条，或用逗号分隔的多条组合
  note?: string
}

export interface GsEntry {
  name: string
  risk: '低' | '中' | '高'
  codes: GsCode[]
  note?: string
}

export interface GsSection {
  title: string
  entries: GsEntry[]
}

export interface GsGame {
  id: string
  name: string
  note?: string
  sections: GsSection[]
}

export const GAMESHARK: GsGame[] = [
  {
    id: 'gen1-rby',
    name: '第一世代 · 红 / 绿 / 蓝（英文版）',
    note: '以下代码对英文版红/绿/蓝通用；日版与汉化版地址不同不可直接套用。XX = 十六进制值。XX 超过 151 会遇到 MissingNo（存档风险）。',
    sections: [
      {
        title: '遇敌控制',
        entries: [
          {
            name: '遇到任意宝可梦（XX = 图鉴号十六进制）',
            risk: '中',
            codes: [{ name: '野外物种', code: '01XXD7CF', note: '15=梦幻(0115D7CF)、99=快龙(0199D7CF)、04=皮卡丘(0104D7CF)' }],
            note: 'XX 超过 151 = MissingNo（有图鉴污染/存档风险，见 BUG 库）'
          },
          {
            name: '野外宝可梦等级（XX = 等级十六进制）',
            risk: '低',
            codes: [{ name: '野外等级', code: '01XXD5CF', note: '64=100级(0164D5CF)、05=5级(0105D5CF)' }]
          },
          {
            name: '必捕捉（任何球按大师球判定）',
            risk: '低',
            codes: [{ name: '必捕捉', code: '01017BCF' }]
          }
        ]
      },
      {
        title: '金钱 / 徽章 / 背包',
        entries: [
          {
            name: '金钱上限 ¥999999（三条同时用）',
            risk: '低',
            codes: [
              { name: '金钱 1/3', code: '019947D2' },
              { name: '金钱 2/3', code: '019948D2' },
              { name: '金钱 3/3', code: '019949D2' }
            ]
          },
          {
            name: '集齐 8 枚徽章',
            risk: '低',
            codes: [{ name: '全徽章', code: '01FF56D2' }]
          },
          {
            name: '背包第 1 格道具（XX = 道具 id 十六进制）',
            risk: '中',
            codes: [{ name: '道具 1', code: '01XX1ED2', note: '01=大师球(01011ED2)、2E=奇异甜片(012E1ED2)' }]
          },
          {
            name: '背包第 1 格数量 99',
            risk: '低',
            codes: [{ name: '数量 99', code: '01631FD2' }]
          }
        ]
      },
      {
        title: '地图 / 操作',
        entries: [
          {
            name: '穿墙（配合方向键）',
            risk: '中',
            codes: [{ name: '穿墙', code: '010138CD' }]
          }
        ]
      }
    ]
  },
  {
    id: 'gen1-yellow',
    name: '第一世代 · 皮卡丘（黄，英文版）',
    note: '黄版地址与红绿蓝基本一致（个别项差异已标注）；日版/汉化版不适用。',
    sections: [
      {
        title: '遇敌控制',
        entries: [
          {
            name: '遇到任意宝可梦（XX = 图鉴号十六进制）',
            risk: '中',
            codes: [{ name: '野外物种', code: '01XXD7CF' }]
          },
          {
            name: '野外宝可梦等级',
            risk: '低',
            codes: [{ name: '野外等级', code: '01XXD5CF' }]
          },
          {
            name: '必捕捉',
            risk: '低',
            codes: [{ name: '必捕捉', code: '01017BCF' }]
          },
          {
            name: '金钱上限 ¥999999（三条同时用）',
            risk: '低',
            codes: [
              { name: '金钱 1/3', code: '019946D2' },
              { name: '金钱 2/3', code: '019947D2' },
              { name: '金钱 3/3', code: '019948D2' }
            ]
          },
          {
            name: '集齐 8 枚徽章',
            risk: '低',
            codes: [{ name: '全徽章', code: '01FF55D2' }]
          }
        ]
      }
    ]
  },
  {
    id: 'gen2-gs',
    name: '第二世代 · 金 / 银（英文版）',
    note: 'Gen2 的大多数修改建议直接用「存档编辑」页（金钱/背包/队伍/DV/病毒都能改且更安全）。以下为经典 GameShark 代码。',
    sections: [
      {
        title: '金钱',
        entries: [
          {
            name: '金钱上限 ¥999999（三条同时用）',
            risk: '低',
            codes: [
              { name: '金钱 1/3', code: '019973D5' },
              { name: '金钱 2/3', code: '019974D5' },
              { name: '金钱 3/3', code: '019975D5' }
            ]
          }
        ]
      },
      {
        title: '对战 / 捕捉',
        entries: [
          {
            name: '敌人等级低（削弱野怪）',
            risk: '低',
            codes: [{ name: '敌方等级', code: '01XX D0D1'.replace(/\s/g, ''), note: 'XX = 等级十六进制；对 loadwildmon 类对战有效' }]
          }
        ]
      }
    ]
  },
  {
    id: 'gen2-crystal',
    name: '第二世代 · 水晶（英文版）',
    note: '水晶版 WRAM 地址与金银不同，代码不通用。',
    sections: [
      {
        title: '金钱',
        entries: [
          {
            name: '金钱上限 ¥999999（三条同时用）',
            risk: '低',
            codes: [
              { name: '金钱 1/3', code: '01994ED8' },
              { name: '金钱 2/3', code: '01994FD8' },
              { name: '金钱 3/3', code: '019950D8' }
            ]
          }
        ]
      }
    ]
  }
]

/** 根据当前打开的 ROM 世代/版本，返回适用的金手指组 */
export function getGamesharkFor(profile: { gen: number; name: string } | null, fileName?: string): { game: GsGame | null; reason: string } {
  if (!profile) return { game: null, reason: '未打开 ROM' }
  const isYellow = profile.name.includes('Yellow') || (fileName ?? '').toLowerCase().includes('pika') || (fileName ?? '').includes('皮卡丘')
  const isCrystal = profile.name.includes('Crystal') || (fileName ?? '').toLowerCase().includes('crystal') || (fileName ?? '').includes('水晶')
  const isGS = profile.gen === 2 && !isCrystal
  if (profile.gen === 1) {
    const game = isYellow ? GAMESHARK.find((g) => g.id === 'gen1-yellow')! : GAMESHARK.find((g) => g.id === 'gen1-rby')!
    return { game, reason: isYellow ? '按黄版地址' : '按红/绿/蓝地址' }
  }
  if (profile.gen === 2) {
    const game = GAMESHARK.find((g) => g.id === (isCrystal ? 'gen2-crystal' : 'gen2-gs'))!
    return { game, reason: isCrystal ? '按水晶版地址' : '按金/银地址' }
  }
  return { game: null, reason: 'Gen3 尚未适配金手指' }
}
