/**
 * ROM 实例级扫描缓存：
 * 打开 ROM 后各类签名扫描只执行一次，切换标签页/重挂载组件直接命中缓存。
 * Rom 实例更换（打开新 ROM）后自动失效（WeakMap 按 Rom 实例回收）。
 */
const cacheStore = new WeakMap<object, Map<string, unknown>>()

export function romMemo<T>(romObj: object, key: string, fn: () => T): T {
  let m = cacheStore.get(romObj)
  if (!m) {
    m = new Map()
    cacheStore.set(romObj, m)
  }
  if (!m.has(key)) m.set(key, fn())
  return m.get(key) as T
}
