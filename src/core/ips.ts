/**
 * IPS 补丁格式：'PATCH' + [3B 偏移(BE), 2B 长度(BE), 数据] + 'EOF'
 * 生成时对比原始快照与当前数据。
 */
export function generateIps(original: Buffer, current: Buffer): Buffer {
  const chunks: number[] = []
  for (const b of 'PATCH') chunks.push(b.charCodeAt(0))

  let i = 0
  while (i < current.length && i < 0xffffff) {
    // 跳过相同区域
    if (i < original.length && current[i] === original[i]) { i++; continue }
    // 收集连续差异（最长 0xFFFF），若遇到 ≥3 字节连续相同则截断（简单实现：允许内含相同字节，牺牲体积）
    const start = i
    let end = i
    let same = 0
    while (end < current.length && end < 0xffffff && end - start < 0xffff) {
      if (end < original.length && current[end] === original[end]) {
        same++
        // 连续 3+ 字节相同则结束本块
        if (same >= 3) break
      } else {
        same = 0
      }
      end++
    }
    // 回退尾部相同的字节
    while (end > start && same > 0) { end--; same-- }
    const size = end - start
    if (size <= 0) { i++; continue }
    // 24 位大端偏移
    chunks.push((start >> 16) & 0xff, (start >> 8) & 0xff, start & 0xff)
    chunks.push((size >> 8) & 0xff, size & 0xff)
    for (let k = start; k < end; k++) chunks.push(current[k])
    i = end
  }
  for (const b of 'EOF') chunks.push(b.charCodeAt(0))
  return Buffer.from(chunks)
}

/** 解析 IPS（用于导入） */
export function applyIps(base: Buffer, ips: Buffer): { data: Buffer; ok: boolean; error?: string } {
  if (ips.subarray(0, 5).toString('latin1') !== 'PATCH') return { data: base, ok: false, error: '不是有效的 IPS 文件（缺少 PATCH 头）' }
  const out = Buffer.from(base)
  let i = 5
  try {
    while (i + 3 <= ips.length) {
      if (ips.subarray(i, i + 3).toString('latin1') === 'EOF') break
      const off = (ips[i] << 16) | (ips[i + 1] << 8) | ips[i + 2]
      const size = (ips[i + 3] << 8) | ips[i + 4]
      i += 5
      if (size === 0) {
        // RLE: 2 字节值 + 1 字节重复次数
        const value = ips[i], count = ips[i + 1]
        i += 2
        for (let k = 0; k < count; k++) out[off + k] = value
      } else {
        for (let k = 0; k < size; k++) out[off + k] = ips[i + k]
        i += size
      }
    }
    return { data: out, ok: true }
  } catch (e) {
    return { data: base, ok: false, error: String(e) }
  }
}
