import { useCallback, useEffect, useMemo, useState, Fragment } from 'react'
import { Rom } from '@core/rom'
import { parseHeader, identifyGame, scanForGen } from '@core/detect'
import {PROFILES, verifyProfile, resolveMovesTable, type GameProfile, resolveMovesTableGen1 } from '@core/profiles'
import { generateIps } from '@core/ips'
import { speciesName } from '@core/names'
import SpeciesEditor from './components/SpeciesEditor'
import MovesEditor from './components/MovesEditor'
import StartersEditor from './components/StartersEditor'
import WildEditor from './components/WildEditor'
import TrainerEditor from './components/TrainerEditor'
import LocationsEditor from './components/LocationsEditor'
import TMEditor from './components/TMEditor'
import LearnsetEditor from './components/LearnsetEditor'
import GlitchesPanel from './components/GlitchesPanel'
import RandomizerPanel from './components/RandomizerPanel'
import TypeChartEditor from './components/TypeChartEditor'
import MartEditor from './components/MartEditor'
import SaveEditorPanel from './components/SaveEditorPanel'
import ItemsAttrEditor from './components/ItemsAttrEditor'
import RoamerEditor from './components/RoamerEditor'
import HexViewer from './components/HexViewer'
import GameCornerPanel from './components/GameCornerPanel'
import GameSharkPanel from './components/GameSharkPanel'
import { NavIcon } from './components/NavIcon'
import ChangeLogPanel from './components/ChangeLogPanel'
import RomInfoPanel from './components/RomInfoPanel'

declare global {
  interface Window {
    pokeforge: {
      openRom: () => Promise<{ filePath: string; fileName: string; data: ArrayBuffer } | null>
      saveRom: (filePath: string, data: ArrayBuffer) => Promise<{ ok: boolean; backup: string }>
      exportIps: (data: ArrayBuffer) => Promise<{ ok: boolean; path?: string }>
      onMenuOpenRom: (cb: () => void) => void
    }
  }
}

export interface OpenedRom {
  filePath: string
  fileName: string
  rom: Rom
  profile: GameProfile
  profileSource: string
}

/** 打开 ROM 并解析 profile（识别失败时用签名扫描兜底） */
function loadProfile(data: Buffer, filePath: string, fileName: string): OpenedRom {
  const platform = data.length >= 0xc0 && data[0xb2] === 0x96 ? 'gba' : 'gb'
  const h = parseHeader(data)
  const rom = new Rom(data, platform)
  const game = identifyGame(h)
  let profile: GameProfile | null = null
  let source = ''
  if (game && PROFILES[game.id]) {
    if (verifyProfile(rom, PROFILES[game.id])) {
      profile = PROFILES[game.id]
      source = `${game.name}（按头部识别）`
    }
  }
  if (!profile) {
    const scan = scanForGen(data)
    if (!scan) throw new Error('无法识别该 ROM：既不是已知的宝可梦游戏，也无法通过特征扫描定位数据表')
    const base = scan.gen === 2 ? PROFILES.silver : scan.gen === 1 ? PROFILES.red : PROFILES.firered
    const entrySize = scan.gen === 2 ? 32 : 28
    const tableOffset = scan.gen === 1 ? scan.bulbasaurOffset : scan.bulbasaurOffset - entrySize
    profile = {
      ...base,
      id: base.id + '-detected',
      name: `${game?.name ?? '未知游戏'}（gen${scan.gen} 特征扫描）`,
      baseStats: { ...base.baseStats, offset: tableOffset },
      moves: undefined
    }
    // 尝试动态扫描招式表（Tom_C 等搬移版 / 日版红绿布局不同）
    if (scan.gen === 2) {
      const movesOff = resolveMovesTable(rom)
      if (movesOff !== null && base.moves) {
        profile.moves = { ...base.moves, offset: movesOff }
      }
    } else if (scan.gen === 1) {
      const movesOff = resolveMovesTableGen1(rom, profile.baseStats.offset)
      if (movesOff !== null) {
        profile.moves = { ...(base.moves ?? { entrySize: 6, count: 165, firstId: 1, fields: [] as never }), offset: movesOff }
      }
      // Mew（151）条目各版本偏移不同，自动扫描
      const mewSig = Buffer.from([0x97, 0x64, 0x64, 0x64, 0x64, 0x64, 0x18, 0x18])
      for (let i = 0x4000; i < data.length - 28; i++) {
        if (data[i] === 0x97 && data.subarray(i, i + 8).equals(mewSig)) {
          profile.baseStats = { ...profile.baseStats, overrides: { ...profile.baseStats.overrides, 151: i } }
          break
        }
      }
    }
    source = `特征扫描 gen${scan.gen}，Bulbasaur @ 0x${scan.bulbasaurOffset.toString(16)}${profile.moves ? `，招式表 @ 0x${profile.moves.offset.toString(16)}` : '，招式表未定位'}`
  }
  return { filePath, fileName, rom, profile, profileSource: source }
}

type Tab = 'species' | 'moves' | 'learnset' | 'starters' | 'wild' | 'roamers' | 'locations' | 'trainers' | 'tm' | 'randomizer' | 'typechart' | 'itemattrs' | 'marts' | 'saveeditor' | 'glitches' | 'hex' | 'gamecorner' | 'gameshark'

export default function App() {
  const [opened, setOpened] = useState<OpenedRom | null>(null)
  const [tab, setTab] = useState<Tab>(() => ((new URLSearchParams(window.location.search).get('tab') as Tab) || 'species'))
  const [error, setError] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const [showLog, setShowLog] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [category, setCategory] = useState('species')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => new URLSearchParams(window.location.search).get('theme') === 'dark' ? 'dark' : ((localStorage.getItem('pf-theme') as 'light' | 'dark') ?? 'light'))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('pf-theme', theme)
  }, [theme])

  useEffect(() => {
    window.addEventListener('error', (e) => {
      setError('界面脚本错误: ' + e.message)
    })
    if (typeof window.pokeforge !== 'undefined') {
      window.pokeforge.onMenuOpenRom(() => { void handleOpen() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpen = useCallback(async () => {
    setError(null)
    try {
      const result = await window.pokeforge.openRom()
      if (!result) return
      const data = Buffer.from(result.data)
      const opened = loadProfile(data, result.filePath, result.fileName)
      setOpened(opened)
      setTab(((new URLSearchParams(window.location.search).get('tab') as Tab) || 'species'))
    } catch (e) {
      setError(String((e as Error).message ?? e))
      setOpened(null)
    }
  }, [])

  const handleSave = useCallback(async () => {
    if (!opened) return
    const result = await window.pokeforge.saveRom(opened.filePath, opened.rom.data.buffer as ArrayBuffer)
    if (result.ok) {
      alert(`已保存到 ${opened.filePath}\n（备份已创建: ${result.backup}）`)
    }
  }, [opened])

  const handleExportIps = useCallback(async () => {
    if (!opened) return
    const ips = generateIps(opened.rom.original, opened.rom.data)
    const result = await window.pokeforge.exportIps(ips.buffer as ArrayBuffer)
    if (result.ok) alert(`IPS 补丁已导出: ${result.path}\n朋友拿原版 ROM 打上这个补丁即可得到你的改版。`)
  }, [opened])

  const dirtyInfo = useMemo(() => {
    if (!opened) return null
    const ranges = opened.rom.getDirtyRanges()
    return { count: opened.rom.modifiedCount, ranges }
  }, [opened, opened?.rom.modifiedCount])

  const CATEGORIES: Array<{ key: string; label: string; children: Array<[Tab, string]> }> = [
    { key: 'species', label: '🐾 精灵', children: [
      ['species', '图鉴'],
      ['learnset', '升级技能表'],
      ['tm', '招式机兼容'],
      ['starters', '初始宝可梦']
    ] },
    { key: 'items', label: '🎒 道具', children: [
      ['itemattrs', '道具属性'],
      ['marts', '商店货架']
    ] },
    { key: 'world', label: '🌍 世界', children: [
      ['wild', '野生遭遇'],
      ['roamers', '传说遭遇'],
      ['typechart', '属性相克表'],
      ['locations', '道馆人物'],
      ['trainers', '人物队伍']
    ] },
    { key: 'tools', label: '🛠 工具', children: [
      ['randomizer', '随机化器'],
      ['gamecorner', '游戏中心'],
      ['saveeditor', '存档编辑'],
      ['glitches', 'BUG 技巧库'],
      ['gameshark', '金手指'],
      ['hex', '十六进制']
    ] }
  ]
  const activeCategory = CATEGORIES.find((c) => c.children.some(([k]) => k === tab)) ?? CATEGORIES[0]

  const apiMissing = typeof window.pokeforge === 'undefined'

  return (
    <div className="app-shell">
      {/* 左侧导航 */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="app-title">⚒ PokéForge</div>
          <div className="app-subtitle">宝可梦 ROM 修改器</div>
        </div>
        <nav className="sidebar-nav">
          {opened && CATEGORIES.map((c) => (
            <div key={c.key}>
              <div className="nav-group-label">{c.label.replace(/^[^ ]+ /, '')}</div>
              {c.children.map(([id, label]) => (
                <div key={id} className={'nav-item' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>
                  <NavIcon category={c.key} />
                  {label}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          PokéForge v0.1 · Gen 1-3
        </div>
      </div>
      {/* 主区域 */}
      <div className="main-area">
        <div className="command-bar">
          <button className="primary" onClick={handleOpen}>{opened ? '打开其他 ROM' : '打开 ROM'}</button>
          {opened && (
            <>
              <span className="rom-info">{opened.fileName} — {opened.profile.name}</span>
              <button className="secondary" onClick={handleSave} disabled={!dirtyInfo?.count}>
                💾 保存{dirtyInfo?.count ? `（${dirtyInfo.count} 处）` : ''}
              </button>
              <button className="secondary" onClick={() => setShowLog((v) => !v)}>
                📋 修改记录{dirtyInfo?.count ? `（${dirtyInfo.count}）` : ''}
              </button>
              <button className="secondary" onClick={() => setShowInfo(true)}>ℹ ROM 信息</button>
              <button className="secondary" onClick={handleExportIps} disabled={!dirtyInfo?.count}>📦 导出 IPS</button>
              <button className="secondary" disabled={!dirtyInfo?.count} onClick={() => { opened.rom.revertAll(); setTick((t) => t + 1) }}>
                ↩ 全部复原
              </button>
            </>
          )}
          <div className="spacer" />
          <button
            className="theme-toggle"
            title="界面主题示意切换（浅色 / 暗色）"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'light' ? '🌙 暗色' : '☀️ 浅色'}
          </button>
          {dirtyInfo?.count ? <span className="badge">⚠ 未保存 {dirtyInfo.count} 字节</span> : null}
        </div>
        <div className="content-area" key={opened?.filePath ?? "none"}>
          {error && (
            <div className="empty">
              <h2>打开失败</h2>
              <p>{error}</p>
            </div>
          )}
          {!opened && !error && (
            <div className="empty">
              <h2>⚒ PokéForge</h2>
              <p>图形化宝可梦 ROM 修改器（Gen 1/2/3 · GB · GBC · GBA）</p>
              <button className="primary" onClick={handleOpen}>选择 ROM 文件开始</button>
              <p>首次保存时会自动创建 .bak 备份</p>
            </div>
          )}
          {opened && (
            <Fragment>
              {tab === 'species' && <SpeciesEditor opened={opened} onChange={() => setTick((t) => t + 1)} />}
              {tab === 'moves' && <MovesEditor opened={opened} onChange={() => setTick((t) => t + 1)} />}
              {tab === 'learnset' && <LearnsetEditor opened={opened} onChange={() => setTick((t) => t + 1)} />}
              {tab === 'starters' && <StartersEditor opened={opened} onChange={() => setTick((t) => t + 1)} />}
              {tab === 'wild' && <WildEditor opened={opened} onChange={() => setTick((t) => t + 1)} />}
              {tab === 'roamers' && <RoamerEditor opened={opened} onChange={() => setTick((t) => t + 1)} />}
              {tab === 'locations' && <LocationsEditor opened={opened} onChange={() => setTick((t) => t + 1)} />}
              {tab === 'trainers' && <TrainerEditor opened={opened} onChange={() => setTick((t) => t + 1)} />}
              {tab === 'glitches' && <GlitchesPanel opened={opened} onChange={() => setTick((t) => t + 1)} />}
              {tab === 'tm' && <TMEditor opened={opened} onChange={() => setTick((t) => t + 1)} />}
              {tab === 'randomizer' && <RandomizerPanel opened={opened} onChange={() => setTick((t) => t + 1)} />}
              {tab === 'typechart' && <TypeChartEditor opened={opened} onChange={() => setTick((t) => t + 1)} />}
              {tab === 'itemattrs' && <ItemsAttrEditor opened={opened} onChange={() => setTick((t) => t + 1)} />}
              {tab === 'marts' && <MartEditor opened={opened} onChange={() => setTick((t) => t + 1)} />}
              {tab === 'gameshark' && <GameSharkPanel opened={opened} />}
              {tab === 'gamecorner' && <GameCornerPanel opened={opened} onChange={() => setTick((t) => t + 1)} />}
              {tab === 'saveeditor' && <SaveEditorPanel opened={opened} onChange={() => setTick((t) => t + 1)} />}
              {tab === 'hex' && <HexViewer opened={opened} />}
            </Fragment>
          )}
        </div>
        <div className="statusbar">
          <span>{opened ? `profile: ${opened.profileSource}` : '未打开 ROM'}</span>
          <div className="spacer" />
          {dirtyInfo?.count ? <span className="dirty">● 有未保存的修改</span> : <span>无未保存修改</span>}
        </div>
      </div>
      {opened && showLog && (
        <ChangeLogPanel opened={opened} onClose={() => setShowLog(false)} onChange={() => setTick((t) => t + 1)} />
      )}
      {opened && showInfo && (
        <RomInfoPanel opened={opened} onClose={() => setShowInfo(false)} />
      )}
    </div>
  )
}

export { speciesName }
