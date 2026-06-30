const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const os = require('os');

let mainWindow;
let isDev = !app.isPackaged;
let wss;
let activeConnection = null;
let ptyProcess = null;
let isAiAccessEnabled = true;
let wsStatus = 'starting';

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

function createTerminal() {
  const shellCommand = os.platform() === 'win32' ? 'cmd.exe' : 'bash';
  try {
    ptyProcess = spawn(shellCommand, [], {
      cwd: os.homedir(),
      env: process.env,
      shell: true
    });

    ptyProcess.stdout.on('data', (data) => {
      const text = data.toString();
      if (activeConnection) {
        activeConnection.send(JSON.stringify({ type: 'output', data: text, id: 'interactive-term' }));
      }
      if (mainWindow) {
        mainWindow.webContents.send('terminal-output', text);
      }
    });

    ptyProcess.stderr.on('data', (data) => {
      const text = data.toString();
      if (activeConnection) {
        activeConnection.send(JSON.stringify({ type: 'output', data: text, id: 'interactive-term' }));
      }
      if (mainWindow) {
        mainWindow.webContents.send('terminal-output', text);
      }
    });
  } catch (err) {
    console.error("Failed to start terminal", err);
  }
}

function startWsServer() {
  wss = new WebSocket.Server({ port: 92323 });

  wss.on('listening', () => {
    wsStatus = 'running';
    if (mainWindow) {
      mainWindow.webContents.send('server-status', { status: wsStatus, port: 92323 });
    }
  });

  wss.on('error', (err) => {
    wsStatus = err.code === 'EADDRINUSE' ? 'port-in-use' : 'error';
    console.error('Failed to start Orion CLI bridge:', err);
    if (mainWindow) {
      mainWindow.webContents.send('server-status', { status: wsStatus, port: 92323, message: err.message });
    }
  });

  wss.on('connection', (ws) => {
    if (!isAiAccessEnabled) {
      ws.close();
      return;
    }
    activeConnection = ws;
    
    // Send a hello back
    ws.send(JSON.stringify({ type: 'connected', message: 'Orion CLI connected' }));
    
    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message);
        if (msg.type === 'hello') {
            ws.send(JSON.stringify({ type: 'connected', cwd: ptyProcess ? process.cwd() : '' }));
        } else if (msg.type === 'execute') {
          if (mainWindow) mainWindow.webContents.send('ai-command', msg.command);
          if (ptyProcess) ptyProcess.stdin.write(msg.command + '\r\n');
        } else if (msg.type === 'cd') {
          if (ptyProcess) ptyProcess.stdin.write(`cd /d "${msg.cwd}"\r\n`);
        }
      } catch (e) {
        console.error(e);
      }
    });

    ws.on('close', () => {
      activeConnection = null;
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Intercept links to open in external browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe')
  });

  createTerminal();
  startWsServer();
  createWindow();

  ipcMain.on('toggle-access', (event, enabled) => {
    isAiAccessEnabled = enabled;
    if (!enabled && activeConnection) {
      activeConnection.close();
    }
  });

  ipcMain.handle('get-access', () => isAiAccessEnabled);
  ipcMain.handle('get-server-status', () => ({ status: wsStatus, port: 92323 }));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
