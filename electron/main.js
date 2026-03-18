const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        title: "Zeugnis Management",
        autoHideMenuBar: true
    });

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startBackend() {
    const isDev = process.env.NODE_ENV === 'development';
    const serverPath = path.join(__dirname, '../server/index.js');

    // Define Data path in UserData
    const userDataPath = app.getPath('userData');
    const dataPath = path.join(userDataPath, 'data');
    if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });

    const env = {
        ...process.env,
        ELECTRON: 'true',
        DATA_PATH: dataPath,
        PORT: 3001,
        // Prisma needs a fixed DB URL in prod if we move it
        DATABASE_URL: `file:${path.join(dataPath, 'prod.db')}`
    };

    serverProcess = spawn('node', [serverPath], {
        env,
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });

    serverProcess.on('message', async (message) => {
        if (message.type === 'print-pdf') {
            const { html, outputPath, id } = message;
            try {
                const printWindow = new BrowserWindow({ show: false });
                await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
                const buffer = await printWindow.webContents.printToPDF({
                    marginsType: 0,
                    pageSize: 'A4',
                    printBackground: true
                });
                fs.writeFileSync(outputPath, buffer);
                printWindow.close();
                serverProcess.send({ type: 'print-pdf-success', id });
            } catch (err) {
                serverProcess.send({ type: 'print-pdf-error', id, error: err.message });
            }
        }
    });

    serverProcess.stdout?.on('data', (data) => {
        console.log(`Server: ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`Server Error: ${data}`);
    });
}

app.whenReady().then(() => {
    startBackend();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

// PDF Generation via Electron IPC
ipcMain.handle('print-to-pdf', async (event, html, outputPath) => {
    const printWindow = new BrowserWindow({ show: false });
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    const buffer = await printWindow.webContents.printToPDF({
        marginsType: 0,
        pageSize: 'A4',
        printBackground: true,
        landscape: false
    });

    fs.writeFileSync(outputPath, buffer);
    printWindow.close();
    return true;
});
