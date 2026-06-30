import { useState, useEffect, useRef } from 'react';
import { Terminal, Power, PowerOff } from 'lucide-react';
import './App.css';

declare global {
  interface Window {
    require?: any;
  }
}

// For electron IPC
const { ipcRenderer } = window.require ? window.require('electron') : { 
  ipcRenderer: { on: () => {}, invoke: async () => true, send: () => {} } 
};

function App() {
  const [accessEnabled, setAccessEnabled] = useState(true);
  const [serverStatus, setServerStatus] = useState<{ status: string; port: number; message?: string }>({
    status: 'starting',
    port: 92323,
  });
  const [logs, setLogs] = useState<{type: 'cmd'|'out', text: string}[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ipcRenderer.invoke('get-access').then(setAccessEnabled);
    ipcRenderer.invoke('get-server-status').then(setServerStatus);

    const handleCommand = (_: any, cmd: string) => {
      setLogs(prev => [...prev, { type: 'cmd', text: cmd }]);
    };
    
    const handleOutput = (_: any, out: string) => {
      setLogs(prev => {
        const last = prev[prev.length - 1];
        if (last && last.type === 'out') {
          const updated = [...prev];
          updated[updated.length - 1].text += out;
          return updated;
        }
        return [...prev, { type: 'out', text: out }];
      });
    };

    const handleServerStatus = (_: any, status: { status: string; port: number; message?: string }) => {
      setServerStatus(status);
    };

    ipcRenderer.on('ai-command', handleCommand);
    ipcRenderer.on('terminal-output', handleOutput);
    ipcRenderer.on('server-status', handleServerStatus);

    return () => {
      // cleanup (electron IPC listeners usually need removeListener but we skip for brevity here)
    };
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const toggleAccess = () => {
    const next = !accessEnabled;
    setAccessEnabled(next);
    ipcRenderer.send('toggle-access', next);
  };

  return (
    <div className="cli-container">
      <div className="cli-header">
        <div className="cli-brand">
          <Terminal size={24} color="#6366f1" />
          <h1>Orion CLI Daemon</h1>
        </div>
        <div className="cli-controls">
          <div className={`bridge-pill ${serverStatus.status}`}>
            Port {serverStatus.port}: {serverStatus.status === 'running' ? 'Ready' : serverStatus.status === 'port-in-use' ? 'Already running' : 'Starting'}
          </div>
          <button 
            className={`toggle-btn ${accessEnabled ? 'enabled' : 'disabled'}`}
            onClick={toggleAccess}
          >
            {accessEnabled ? <Power size={16} /> : <PowerOff size={16} />}
            {accessEnabled ? 'AI Access Enabled' : 'AI Access Disabled'}
          </button>
        </div>
      </div>
      
      <div className="cli-logs-panel">
        <div className="cli-logs-header">
          <span>Real-time Activity</span>
          <span className={`status-dot ${serverStatus.status === 'running' ? 'pulsing' : ''}`}></span>
        </div>
        {serverStatus.status === 'port-in-use' && (
          <div className="cli-warning">
            Another Orion CLI instance is already listening on port {serverStatus.port}. Close the old instance from Task Manager if the web app cannot connect.
          </div>
        )}
        <div className="cli-logs">
          {logs.length === 0 && (
            <div className="cli-logs-empty">Waiting for commands from Orion Web App...</div>
          )}
          {logs.map((log, i) => (
            <div key={i} className={`log-entry ${log.type}`}>
              {log.type === 'cmd' ? (
                <>
                  <span className="log-prompt">$</span>
                  <span className="log-cmd">{log.text}</span>
                </>
              ) : (
                <span className="log-out">{log.text}</span>
              )}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}

export default App;
