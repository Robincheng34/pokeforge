// 必须在所有引用 Buffer 的模块之前求值（import 顺序保证）
import { Buffer as NodeBuffer } from 'buffer'
;(globalThis as unknown as { Buffer: unknown }).Buffer = NodeBuffer
export {}
