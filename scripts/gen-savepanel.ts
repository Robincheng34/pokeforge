/**
 * 生成完整的 SaveEditorPanel.tsx（人物信息卡→背包→PC盒子→队伍 排列）
 */
import * as fs from 'fs'
const sections = {
  imports: `import { useState } from 'react'
import type { OpenedRom } from '../App'
import {
  openSav, fixSavChecksum, sortAllBoxes, sortBoxByDex, readBox, BOX_COUNT,
  getPlayerInfo, setPlayerName, setMoney, setCoins, getCoins, getBadges, toggleBadge, readBag, writeBagItem,
  BADGE_NAMES, type SavInfo
} from '@core/saveedit'
import { speciesName, moveName } from '@core/names'
import PFIcon from './PFIcon'
import gen2Zh from '@core/gen2-items-zh.json'`,
  playerCard: `
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
        <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>👤 人物信息卡</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13 }}>玩家名：</span>
          <input defaultValue={pi.name} key={'pname-' + pi.name}
            style={{ width: 140, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '2px 6px', font: 'inherit' }}
            onBlur={(e) => { if (!setPlayerName(savRom, e.target.value)) alert('名字仅支持英文字母/数字/空格'); onChange() }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          />
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>（仅支持英文字母/数字/空格）</span>
          <span style={{ fontSize: 13 }}>金钱：</span>
          <input defaultValue={pi.money} key={'money-' + pi.money}
            style={{ width: 100, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '2px 6px', font: 'inherit' }}
            onBlur={(e) => { setMoney(savRom, parseInt(e.target.value, 10) || 0); onChange() }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          />
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>（上限 999999）</span>
          <span style={{ fontSize: 13 }}>代币：</span>
          <input defaultValue={getCoins(savRom)} key={'coins-' + getCoins(savRom)}
            style={{ width: 80, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '2px 6px', font: 'inherit' }}
            onBlur={(e) => { setCoins(savRom, parseInt(e.target.value, 10) || 0); onChange() }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          />
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>（游戏中心用，上限 9999）</span>
        </div>
        <div style={{ marginBottom: 6 }}>
          <strong style={{ color: 'var(--accent)', fontSize: 13 }}>🏅 徽章（点击点亮/熄灭）</strong>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {BADGE_NAMES.johto.map((name, i) => (
            <BadgeChip key={'j' + i} name={name} on={badges.johto[i]} color="#f7c948" onClick={() => { toggleBadge(savRom, 'johto', i); onChange() }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {BADGE_NAMES.kanto.map((name, i) => (
            <BadgeChip key={'k' + i} name={name} on={badges.kanto[i]} color="#9ece6a" onClick={() => { toggleBadge(savRom, 'kanto', i); onChange() }} />
          ))}
        </div>
      </div>`,
  bag: `
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
        <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>🎒 背包</div>
        {bag.map((pocket, pi2) => (
          <div key={pi2} style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 600, margin: '4px 0', fontSize: 12.5 }}>{pocket.name}（{pocket.slots.length} 种）</div>
            {pocket.slots.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>（空）</div>
            ) : (
              <table className="grid">
                <thead><tr><th>#</th><th>道具</th><th>数量</th></tr></thead>
                <tbody>
                  {pocket.slots.map((slot, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>
                        <select value={slot.item} onChange={(e) => writeBagItem(savRom, slot.itemOff, slot.qtyOff, parseInt(e.target.value, 10), slot.qty)}
                          style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '2px 4px', width: 200 }}>
                          <option value={0}>（空位）</option>
                          {Array.from({ length: 95 }, (_, k) => k + 1).map((iid) => (
                            <option key={iid} value={iid}>{iid} {ITEM_ZH[iid] ?? '?'}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input defaultValue={slot.qty} key={'q' + pi2 + '-' + i + '-' + slot.qty} style={{ width: 48 }}
                          onBlur={(e) => {
                            const v = parseInt(e.target.value, 10)
                            if (!Number.isNaN(v) && v >= 1 && v <= 99) writeBagItem(savRom, slot.itemOff, slot.qtyOff, slot.item, v)
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>`,
  pcBoxes: `
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
        <div className="searchbar" style={{ marginBottom: 8 }}>
          <strong style={{ color: 'var(--accent)' }}>🗄 PC 盒子</strong>
          <button onClick={() => { if (window.confirm('按图鉴编号排序所有盒子？')) sortAll() }}>
            一键整理全部盒子
          </button>
        </div>
        <table className="grid">
          <thead>
            <tr><th>盒子</th><th>内容（图鉴 · 等级）</th><th></th></tr>
          </thead>
          <tbody>
            {Array.from({ length: BOX_COUNT }, (_, k) => k + 1).map((k) => {
              const mons = readBox(savRom, k)
              return (
                <tr key={k}>
                  <td>盒子 {k}</td>
                  <td style={{ textAlign: 'left' }}>
                    {mons.length === 0
                      ? <span style={{ color: 'var(--muted)' }}>（空）</span>
                      : mons.map((m, i) => (
                        <span key={i} style={{ marginRight: 10 }}>
                          {m.species >= 0xfd ? '🥚' : spName(m.species)}·Lv{m.level}
                        </span>
                      ))}
                  </td>
                  <td>
                    {mons.length > 1 && (
                      <button className="secondary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => sortBox(k)}>排序</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>`,
  party: `
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
        <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>🐾 队伍宝可梦（{info.partyCount} 只）</div>
        <table className="grid">
          <thead>
            <tr>
              <th>#</th><th>宝可梦</th><th>携带道具</th><th>招式1</th><th>招式2</th><th>招式3</th><th>招式4</th><th>等级</th><th>HP</th>
  
