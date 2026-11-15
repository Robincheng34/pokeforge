/**
 * ROM 底层封装：bank 地址换算、读写、修改跟踪、header 校验和
 */
export type Platform = 'gb' | 'gba'

export class Rom {
  readonly data: Buffer
  /** 打开时的原始数据快照（用于复原） */
  readonly original: Buffer
  readonly platform: Platform
  /** 已修改的文件偏移集合 */
  private dirty = new Set<number>()

  constructor(data: Buffer, platform: Platform) {
    this.data = data
    this.original = Buffer.from(data)
    this.platform = platform
  }

  get size(): number {
    return this.data.length
  }

  /** GB/GBC: bank 号 + 地址 → 文件偏移。addr < 0x4000 恒为 bank 0 */
  static gbFileOffset(bank: number, addr: number): number {
    if (addr < 0x4000) return addr
    return bank * 0x4000 + (addr - 0x4000)
  }

  /** bank:addr 形式的字符串（如 "0E:43DE"）→ 文件偏移 */
  static parseGbAddress(s: string): number {
    const m = s.trim().match(/^([0-9A-Fa-f]{1,2})[:_]([0-9A-Fa-f]{1,4})$/)
    if (!m) throw new Error(`无法解析 GB 地址: ${s}`)
    return Rom.gbFileOffset(parseInt(m[1], 16), parseInt(m[2], 16))
  }

  /** GBA 0x08xxxxxx → 文件偏移 */
  static gbaFileOffset(addr: number): number {
    return addr & 0x01ffffff
  }

  /** 按平台把 "0E:43DE" 或 "0x08254xxx" 统一换算成文件偏移 */
  static toFileOffset(platform: Platform, addrStr: string): number {
    if (platform === 'gb') return Rom.parseGbAddress(addrStr)
    const n = addrStr.startsWith('0x') ? parseInt(addrStr, 16) : parseInt(addrStr, 16)
    return Rom.gbaFileOffset(n)
  }

  readU8(fileOffset: number): number {
    return this.data[fileOffset]
  }

  readU16(fileOffset: number): number {
    return this.data[fileOffset] | (this.data[fileOffset + 1] << 8)
  }

  readBytes(fileOffset: number, len: number): Buffer {
    return this.data.subarray(fileOffset, fileOffset + len)
  }

  writeU8(fileOffset: number, value: number): void {
    if (value < 0 || value > 0xff) throw new Error(`u8 超范围: ${value} @ 0x${fileOffset.toString(16)}`)
    this.data[fileOffset] = value
    // 写回原始值 = 视为未修改（同时支撑“改回原值即可撤销”的交互）
    if (value === this.original[fileOffset]) this.dirty.delete(fileOffset)
    else this.dirty.add(fileOffset)
  }

  writeU16(fileOffset: number, value: number): void {
    this.writeU8(fileOffset, value & 0xff)
    this.writeU8(fileOffset + 1, (value >> 8) & 0xff)
  }

  get modifiedCount(): number {
    return this.dirty.size
  }

  get isDirty(): boolean {
    return this.dirty.size > 0
  }

  /** 修改过的偏移（排序后返回） */
  getDirtyRanges(): Array<[number, number]> {
    const sorted = [...this.dirty].sort((a, b) => a - b)
    const ranges: Array<[number, number]> = []
    for (const off of sorted) {
      const last = ranges[ranges.length - 1]
      if (last && off === last[1] + 1) last[1] = off
      else ranges.push([off, off])
    }
    return ranges
  }

  /** 全部复原：恢复到打开时的原始状态 */
  revertAll(): void {
    this.data.set(this.original)
    this.dirty.clear()
  }

  /** 单条复原：恢复一段连续区间 */
  revertRange(start: number, end: number): void {
    for (let o = start; o <= end; o++) {
      this.data[o] = this.original[o]
      this.dirty.delete(o)
    }
  }

  /** 查询某偏移的原始值 */
  originalByte(offset: number): number {
    return this.original[offset]
  }

  /** 重新计算 GB header 校验和（0x14D: 0x134-0x14C 累加取补码）。GBA  complement checksum 0xBD 同理 */
  fixHeaderChecksum(): void {
    if (this.platform === 'gb') {
      let sum = 0
      for (let i = 0x134; i <= 0x14c; i++) sum = (sum + this.data[i]) & 0xff
      this.data[0x14d] = (0 - (sum + 25)) & 0xff
    } else {
      let sum = 0
      for (let i = 0xa0; i <= 0xbc; i++) sum = (sum + this.data[i]) & 0xff
      this.data[0xbd] = (-(sum + 0x19)) & 0xff
    }
  }
}
