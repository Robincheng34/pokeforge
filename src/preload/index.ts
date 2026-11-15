import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('pokeforge', {
  openRom: () => ipcRenderer.invoke('rom:open'),
  saveRom: (filePath: string, data: ArrayBuffer) => ipcRenderer.invoke('rom:save', filePath, data),
  exportIps: (data: ArrayBuffer) => ipcRenderer.invoke('rom:exportIps', data),
  onMenuOpenRom: (cb: () => void) => { ipcRenderer.on('menu:open-rom', cb) }
})
