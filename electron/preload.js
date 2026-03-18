const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    printToPDF: (html, outputPath) => ipcRenderer.invoke('print-to-pdf', html, outputPath)
});
