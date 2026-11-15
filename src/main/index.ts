import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

/** 中文应用菜单 */
function buildChineseMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { label: '打开 ROM...', accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu:open-rom') },
        { type: 'separator' },
        { label: '退出', role: 'quit' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '全选', role: 'selectAll' }
      ]
    },
    {
      label: '查看',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { type: 'separator' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { label: '重置缩放', role: 'resetZoom' },
        { type: 'separator' },
        { label: '切换开发者工具', role: 'toggleDevTools' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 PokéForge',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: '关于 PokéForge',
              message: 'PokéForge v0.1.0',
              detail: '图形化宝可梦 ROM 修改器\n支持 Gen 1/2/3 · GB · GBC · GBA\n\n修改前自动备份为 .bak 文件'
            })
          }
        }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    title: 'PokéForge — 宝可梦 ROM 修改器',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  // 渲染进程 console / 错误转发到主进程日志，便于诊断
  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
  })
  mainWindow.webContents.on('preload-error', (_e, p, error) => {
    console.error(`[preload-error] ${p}: ${error}`)
  })
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[render-gone]', details.reason)
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
        const q = new URLSearchParams()
    if (process.argv.includes('--pf-dark')) q.set('theme', 'dark')
    const tabIdx = process.argv.indexOf('--pf-tab')
    if (tabIdx !== -1 && process.argv[tabIdx + 1]) q.set('tab', process.argv[tabIdx + 1])
    const qs = q.toString()
    mainWindow.loadURL('file://' + path.join(__dirname, '../renderer/index.html') + (qs ? '?' + qs : ''))
    if (process.argv.includes('--pf-demo')) {
      mainWindow.webContents.on('did-finish-load', () => {
        setTimeout(() => mainWindow?.webContents.send('menu:open-rom'), 300) // demo 自动打开 ROM（等监听器就绪）
      })
    }
  }
}

app.whenReady().then(() => {
  buildChineseMenu()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ---- IPC ----

ipcMain.handle('rom:open', async () => {
  // --pf-demo <path>: 演示模式直接载入指定 ROM（跳过文件对话框）
  const demoIdx = process.argv.indexOf('--pf-demo')
  if (demoIdx !== -1 && process.argv[demoIdx + 1]) {
    const demoPath = process.argv[demoIdx + 1]
    const demoData = fs.readFileSync(demoPath)
    return { filePath: demoPath, fileName: path.basename(demoPath), data: demoData.buffer.slice(demoData.byteOffset, demoData.byteOffset + demoData.byteLength) }
  }
  const result = await dialog.showOpenDialog({
    title: '选择 ROM 文件',
    filters: [
      { name: 'ROM 文件', extensions: ['gb', 'gbc', 'gba'] },
      { name: '所有文件', extensions: ['*'] }
    ],
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  const data = fs.readFileSync(filePath)
  return { filePath, fileName: path.basename(filePath), data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) }
})

ipcMain.handle('rom:save', async (_e, filePath: string, data: ArrayBuffer) => {
  const p = Buffer.from(data)
  // 首次保存前自动备份
  const bakPath = filePath + '.bak'
  if (!fs.existsSync(bakPath)) {
    fs.copyFileSync(filePath, bakPath)
  }
  fs.writeFileSync(filePath, p)
  return { ok: true, backup: bakPath }
})

ipcMain.handle('rom:exportIps', async (_e, data: ArrayBuffer) => {
  const result = await dialog.showSaveDialog({
    title: '导出 IPS 补丁',
    defaultPath: 'pokeforge-patch.ips',
    filters: [{ name: 'IPS 补丁', extensions: ['ips'] }]
  })
  if (result.canceled || !result.filePath) return { ok: false }
  fs.writeFileSync(result.filePath, Buffer.from(data))
  return { ok: true, path: result.filePath }
})
