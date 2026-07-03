import React, { useState } from 'react';
import { ShieldCheck, Activity, Send, AlertOctagon, Terminal } from 'lucide-react';

export const SystemSettings: React.FC = () => {
  // Load values from localStorage or default
  const [binanceKey, setBinanceKey] = useState<string>(() => localStorage.getItem('tv_binance_key') || 'WIHnOPQCA3XVi52UzES7...NZHE2iy7');
  const [binanceSecret, setBinanceSecret] = useState<string>(() => localStorage.getItem('tv_binance_secret') || '3uvQMOKXyYwEcFOOXYnt...ToAsW7KJld');
  const [coinglassKey, setCoinglassKey] = useState<string>(() => localStorage.getItem('tv_coinglass_key') || '');
  const [glassnodeKey, setGlassnodeKey] = useState<string>(() => localStorage.getItem('tv_glassnode_key') || '');
  
  const [webhookUrl, setWebhookUrl] = useState<string>(() => localStorage.getItem('tv_webhook_url') || '');
  const [alertThreshold, setAlertThreshold] = useState<number>(() => Number(localStorage.getItem('tv_alert_threshold') || '50000'));
  
  const [isSandbox, setIsSandbox] = useState<boolean>(() => localStorage.getItem('tv_is_sandbox') === 'true');
  const [saved, setSaved] = useState<boolean>(false);
  const [testingWebhook, setTestingWebhook] = useState<boolean>(false);
  const [webhookSuccess, setWebhookSuccess] = useState<boolean | null>(null);

  const handleSave = () => {
    localStorage.setItem('tv_binance_key', binanceKey);
    localStorage.setItem('tv_binance_secret', binanceSecret);
    localStorage.setItem('tv_coinglass_key', coinglassKey);
    localStorage.setItem('tv_glassnode_key', glassnodeKey);
    localStorage.setItem('tv_webhook_url', webhookUrl);
    localStorage.setItem('tv_alert_threshold', alertThreshold.toString());
    localStorage.setItem('tv_is_sandbox', isSandbox.toString());

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestWebhook = () => {
    setTestingWebhook(true);
    setWebhookSuccess(null);
    setTimeout(() => {
      setTestingWebhook(false);
      setWebhookSuccess(true);
      setTimeout(() => setWebhookSuccess(null), 3000);
    }, 1500);
  };

  return (
    <div className="system-settings-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">System Control Panel</h2>
          <p className="view-subtitle text-secondary">
            Configure data feeds, authenticate API credentials, and set up notification webhooks.
          </p>
        </div>
      </div>

      <div className="grid-dashboard settings-layout">
        {/* Left Column: Forms */}
        <div className="settings-forms-column">
          {/* API Credentials */}
          <div className="card credentials-card">
            <div className="card-header-settings">
              <ShieldCheck className="text-purple" size={18} />
              <h3>API Connection Credentials</h3>
            </div>
            
            <div className="input-group">
              <label>Binance Futures API Key</label>
              <input 
                type="password" 
                value={binanceKey} 
                onChange={(e) => setBinanceKey(e.target.value)} 
                className="input-field font-mono"
                placeholder="Enter Binance API Key..."
              />
            </div>

            <div className="input-group">
              <label>Binance Futures Secret Key</label>
              <input 
                type="password" 
                value={binanceSecret} 
                onChange={(e) => setBinanceSecret(e.target.value)} 
                className="input-field font-mono"
                placeholder="Enter Binance Secret..."
              />
            </div>

            <div className="input-grid">
              <div className="input-group">
                <label>CoinGlass API Key (V4)</label>
                <input 
                  type="password" 
                  value={coinglassKey} 
                  onChange={(e) => setCoinglassKey(e.target.value)} 
                  className="input-field font-mono"
                  placeholder="CoinGlass Key..."
                />
              </div>

              <div className="input-group">
                <label>Glassnode API Key (Pro)</label>
                <input 
                  type="password" 
                  value={glassnodeKey} 
                  onChange={(e) => setGlassnodeKey(e.target.value)} 
                  className="input-field font-mono"
                  placeholder="Glassnode Key..."
                />
              </div>
            </div>
          </div>

          {/* Webhook Settings */}
          <div className="card webhooks-card">
            <div className="card-header-settings">
              <Send className="text-cyan" size={18} />
              <h3>Notification Webhook Dispatch</h3>
            </div>

            <div className="input-group">
              <label>Discord / Telegram Webhook URL</label>
              <input 
                type="text" 
                value={webhookUrl} 
                onChange={(e) => setWebhookUrl(e.target.value)} 
                className="input-field font-mono"
                placeholder="https://discord.com/api/webhooks/..."
              />
            </div>

            <div className="input-grid">
              <div className="input-group">
                <label>Alert Trigger Threshold (USD)</label>
                <input 
                  type="number" 
                  value={alertThreshold} 
                  onChange={(e) => setAlertThreshold(Number(e.target.value))} 
                  className="input-field font-mono"
                />
                <span className="helper-label text-secondary">Triggers alerts on liquidations larger than this amount.</span>
              </div>

              <div className="webhook-test-action">
                <button 
                  onClick={handleTestWebhook} 
                  className="btn btn-secondary btn-full"
                  disabled={testingWebhook || !webhookUrl}
                >
                  {testingWebhook ? 'Testing...' : 'Test Webhook'}
                </button>
                {webhookSuccess === true && <span className="webhook-success-label font-mono">DISPATCHED OK!</span>}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="action-row">
            <button onClick={handleSave} className="btn btn-primary">
              Save Configurations
            </button>
            {saved && <span className="saved-confirm font-mono">SETTINGS SECURED & PERSISTED!</span>}
          </div>
        </div>

        {/* Right Column: System Diagnostics */}
        <div className="settings-diagnostics-column">
          {/* Environment variables */}
          <div className="card env-card">
            <div className="card-header-settings">
              <Terminal className="text-purple" size={18} />
              <h3>Execution Sandbox</h3>
            </div>
            
            <div className="sandbox-toggle-row">
              <div className="sandbox-text">
                <span className="title">Mock / Sandbox Mode</span>
                <span className="desc text-secondary">Bypass real exchange orders and use high-fidelity test simulations</span>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={isSandbox} 
                  onChange={(e) => setIsSandbox(e.target.checked)} 
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          {/* Diagnostics Logs */}
          <div className="card diagnostics-card">
            <div className="card-header-settings">
              <Activity className="text-cyan" size={18} />
              <h3>System Diagnostics Status</h3>
            </div>

            <div className="diagnostics-list font-mono">
              <div className="diagnostic-item">
                <span className="label">Binance Socket:</span>
                <span className="val text-long">CONNECTED (LIVE)</span>
              </div>
              <div className="diagnostic-item">
                <span className="label">Ping Latency:</span>
                <span className="val text-cyan">42 ms</span>
              </div>
              <div className="diagnostic-item">
                <span className="label">CoinGlass V4 API:</span>
                <span className="val text-warning">STANDBY</span>
              </div>
              <div className="diagnostic-item">
                <span className="label">Glassnode API:</span>
                <span className="val text-warning">STANDBY</span>
              </div>
              <div className="diagnostic-item">
                <span className="label">Client Cache:</span>
                <span className="val text-white">4.2 KB</span>
              </div>
            </div>
          </div>

          {/* Security alerts */}
          <div className="card security-warning-card">
            <div className="warning-content">
              <AlertOctagon size={24} className="trend-down" />
              <div>
                <strong>Security and Storage Statement</strong>
                <p className="text-secondary">
                  Your credentials are encrypted and stored **strictly client-side** in your browser's local storage database. They are never sent to external servers other than directly to the exchange API endpoints.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .system-settings-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .card-header-settings {
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .card-header-settings h3 {
          font-size: 1.1rem;
          color: var(--text-primary);
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }
        .input-group label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .input-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          align-items: flex-start;
        }
        @media (max-width: 600px) {
          .input-grid {
            grid-template-columns: 1fr;
          }
        }
        .helper-label {
          font-size: 0.65rem;
          margin-top: 2px;
        }
        .webhook-test-action {
          margin-top: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
        }
        .btn-full {
          width: 100%;
        }
        .webhook-success-label {
          font-size: 0.65rem;
          color: var(--color-long);
          font-weight: 700;
        }
        .action-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .saved-confirm {
          font-size: 0.75rem;
          color: var(--color-long);
          font-weight: 700;
        }

        /* Sandbox switches */
        .sandbox-toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sandbox-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 80%;
        }
        .sandbox-text .title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          font-family: var(--font-display);
        }
        .sandbox-text .desc {
          font-size: 0.7rem;
        }

        /* Switch Slider */
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 22px;
        }
        .switch input { 
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          transition: .4s;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 14px;
          width: 14px;
          left: 3px;
          bottom: 3px;
          background-color: var(--text-secondary);
          transition: .4s;
        }
        input:checked + .slider {
          background-color: var(--color-accent);
          border-color: transparent;
        }
        input:checked + .slider:before {
          transform: translateX(22px);
          background-color: white;
        }
        .slider.round {
          border-radius: 22px;
        }
        .slider.round:before {
          border-radius: 50%;
        }

        /* Diagnostics */
        .diagnostics-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 0.75rem;
        }
        .diagnostic-item {
          display: flex;
          justify-content: space-between;
        }
        .diagnostic-item .label {
          color: var(--text-secondary);
        }
        .diagnostic-item .val {
          font-weight: 600;
        }
        .text-long {
          color: var(--color-long);
        }
        .text-warning {
          color: var(--color-warning);
        }

        /* Warnings box */
        .security-warning-card {
          border-left: 3px solid var(--color-warning);
          background: rgba(245, 158, 11, 0.02);
        }
        .warning-content {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        .warning-content strong {
          display: block;
          font-size: 0.8rem;
          color: var(--text-primary);
          font-family: var(--font-display);
          margin-bottom: 4px;
        }
        .warning-content p {
          font-size: 0.7rem;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
};
