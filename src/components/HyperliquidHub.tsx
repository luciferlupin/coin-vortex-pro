/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Wifi, 
  Play, 
  Pause, 
  Trash2, 
  Activity, 
  AlertTriangle,
  Flame,
  Volume2,
  Lock,
  ArrowRightLeft,
  Filter
} from 'lucide-react';
import { 
  getHyperliquidAssetStats, 
  getHyperliquidRecentTrades, 
  connectHyperliquidTrades 
} from '../services/apiService';
import type { 
  HyperliquidTrade, 
  HyperliquidAssetStats 
} from '../services/apiService';

interface HyperliquidHubProps {
  selectedToken: string;
  isLightTheme: boolean;
}

export const HyperliquidHub: React.FC<HyperliquidHubProps> = ({
  selectedToken,
  isLightTheme: _isLightTheme,
}) => {
  const [stats, setStats] = useState<HyperliquidAssetStats | null>(null);
  const [recentTrades, setRecentTrades] = useState<HyperliquidTrade[]>([]);
  const [whaleTrades, setWhaleTrades] = useState<HyperliquidTrade[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [msgCount, setMsgCount] = useState<number>(0);
  const [latency, setLatency] = useState<number | null>(null);
  
  // Whale Filter States
  const [whaleThreshold, setWhaleThreshold] = useState<number>(10000); // Default $10k
  const [customThreshold, setCustomThreshold] = useState<string>('');
  
  // For flash animation triggers
  const [lastWhaleTradeId, setLastWhaleTradeId] = useState<string | null>(null);
  
  // Volume stats
  const [whaleBuyVolume, setWhaleBuyVolume] = useState<number>(0);
  const [whaleSellVolume, setWhaleSellVolume] = useState<number>(0);
  const [totalFilteredVolume, setTotalFilteredVolume] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const isPausedRef = useRef<boolean>(isPaused);
  const whaleThresholdRef = useRef<number>(whaleThreshold);

  // Sync refs for the callback hook to avoid re-binding WS connection
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    whaleThresholdRef.current = whaleThreshold;
  }, [whaleThreshold]);

  // Load stats and bootstrap trades on token change
  useEffect(() => {
    let active = true;
    setStats(null);
    setRecentTrades([]);
    setWhaleTrades([]);
    setWhaleBuyVolume(0);
    setWhaleSellVolume(0);
    setTotalFilteredVolume(0);
    setMsgCount(0);
    setLatency(null);
    setWsStatus('connecting');

    const loadStatsAndBootstrap = async () => {
      try {
        const statsData = await getHyperliquidAssetStats(selectedToken);
        if (!active) return;
        if (statsData) {
          setStats(statsData);
        }

        const bootstrapTrades = await getHyperliquidRecentTrades(selectedToken);
        if (!active) return;
        
        // Reverse recent trades so chronological sequence flows forwards into the stream
        const initialTrades = [...bootstrapTrades].slice(0, 100);
        setRecentTrades(initialTrades);

        // Process bootstrap trades for whale tracker
        const currentThreshold = whaleThresholdRef.current;
        let initialWhales: HyperliquidTrade[] = [];
        let buyVol = 0;
        let sellVol = 0;
        let totalVol = 0;

        initialTrades.forEach((t) => {
          const px = parseFloat(t.px);
          const sz = parseFloat(t.sz);
          const valUsd = px * sz;
          
          if (valUsd >= currentThreshold) {
            initialWhales.push(t);
            if (t.side === 'B') {
              buyVol += valUsd;
            } else {
              sellVol += valUsd;
            }
            totalVol += valUsd;
          }
        });

        setWhaleTrades(initialWhales.slice(0, 50));
        setWhaleBuyVolume(buyVol);
        setWhaleSellVolume(sellVol);
        setTotalFilteredVolume(totalVol);
      } catch (err) {
        console.error('Error bootstrapping Hyperliquid data:', err);
      }
    };

    loadStatsAndBootstrap();

    // Poll stats every 8 seconds
    const intervalId = setInterval(async () => {
      try {
        const statsData = await getHyperliquidAssetStats(selectedToken);
        if (active && statsData) {
          setStats(statsData);
        }
      } catch (err) {
        console.error('Error polling Hyperliquid stats:', err);
      }
    }, 8000);

    // Setup live trades WS stream
    const handleNewTrade = (trade: HyperliquidTrade) => {
      if (!active) return;

      const px = parseFloat(trade.px);
      const sz = parseFloat(trade.sz);
      const usdValue = px * sz;
      const tId = `${trade.time}-${trade.px}-${trade.sz}-${Math.random()}`;

      // Update message counts and compute WS message latency
      setMsgCount(prev => prev + 1);
      const delay = Date.now() - trade.time;
      setLatency(delay > 0 ? delay : 10);

      // Append to raw trades list if not paused
      if (!isPausedRef.current) {
        setRecentTrades((prev) => {
          const list = [trade, ...prev];
          if (list.length > 100) list.pop();
          return list;
        });
      }

      // Check if it satisfies Whale criteria
      if (usdValue >= whaleThresholdRef.current) {
        // Add to whale trades list (independent of pause)
        setWhaleTrades((prev) => {
          const list = [trade, ...prev];
          if (list.length > 50) list.pop();
          return list;
        });

        // Trigger flash notification
        setLastWhaleTradeId(tId);
        setTimeout(() => setLastWhaleTradeId(null), 1000);

        // Update volumes
        setTotalFilteredVolume(prev => prev + usdValue);
        if (trade.side === 'B') {
          setWhaleBuyVolume(prev => prev + usdValue);
        } else {
          setWhaleSellVolume(prev => prev + usdValue);
        }
      }
    };

    try {
      const ws = connectHyperliquidTrades(selectedToken, handleNewTrade);
      wsRef.current = ws;
      
      ws.addEventListener('open', () => {
        if (active) setWsStatus('connected');
      });
      ws.addEventListener('close', () => {
        if (active) setWsStatus('disconnected');
      });
      ws.addEventListener('error', () => {
        if (active) setWsStatus('disconnected');
      });
    } catch (err) {
      console.error('Error connecting to Hyperliquid WS:', err);
      setWsStatus('disconnected');
    }

    return () => {
      active = false;
      clearInterval(intervalId);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedToken]);

  // Recalculate whales when threshold changes
  useEffect(() => {
    let buyVol = 0;
    let sellVol = 0;
    let totalVol = 0;
    const filtered = recentTrades.filter((t) => {
      const valUsd = parseFloat(t.px) * parseFloat(t.sz);
      if (valUsd >= whaleThreshold) {
        if (t.side === 'B') buyVol += valUsd;
        else sellVol += valUsd;
        totalVol += valUsd;
        return true;
      }
      return false;
    });
    setWhaleTrades(filtered.slice(0, 50));
    setWhaleBuyVolume(buyVol);
    setWhaleSellVolume(sellVol);
    setTotalFilteredVolume(totalVol);
  }, [whaleThreshold]);

  const handleCustomThresholdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customThreshold);
    if (!isNaN(val) && val > 0) {
      setWhaleThreshold(val);
    }
  };

  const handleClearFeed = () => {
    setRecentTrades([]);
  };

  const formatCompactVal = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  // Compute whale percentages
  const totalVolume = recentTrades.reduce((sum, t) => sum + parseFloat(t.px) * parseFloat(t.sz), 0);
  const whaleVolumePct = totalVolume > 0 ? (totalFilteredVolume / totalVolume) * 100 : 0;
  
  const whaleBuyPct = totalFilteredVolume > 0 ? (whaleBuyVolume / totalFilteredVolume) * 100 : 50;
  const whaleSellPct = 100 - whaleBuyPct;

  if (selectedToken === 'XAU') {
    return (
      <div className="hyperliquid-hub-container">
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <AlertTriangle size={48} className="text-yellow" style={{ margin: '0 auto 16px auto', display: 'block', color: 'var(--color-warning)' }} />
          <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)' }}>Asset Not Listed on Hyperliquid</h3>
          <p className="text-secondary" style={{ marginTop: '10px', maxWidth: '520px', margin: '10px auto 0 auto', fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            The Hyperliquid Perpetual DEX specializes in decentralized cryptocurrency derivatives. Commodities like XAU/USD (Gold) are not currently listed in the Hyperliquid universe.
          </p>
          <p style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Please select a cryptocurrency (e.g. BTC, ETH, SOL, XRP, ADA, DOGE) from the watchlist to monitor live order book flow.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="hyperliquid-hub-container">
      {/* View Header */}
      <div className="view-header-row">
        <div>
          <div className="title-tag">
            <Zap size={14} className="icon-glow-purple" />
            <span>Hyperliquid Mainnet DEX Integration</span>
          </div>
          <h2 className="view-title">Hyperliquid Order Flow &amp; Whale Terminal</h2>
          <p className="view-subtitle text-secondary">
            Live order book execution tracking, trade volumes, and automated whale block detection streamed directly from Hyperliquid's raw WebSockets.
          </p>
        </div>

        {/* WebSocket Status Diagnostic Pill */}
        <div className="diagnostic-panel card">
          <div className="status-header">
            <div className={`status-dot ${wsStatus}`}></div>
            <span className="status-label font-mono">
              WS: {wsStatus.toUpperCase()}
            </span>
          </div>
          <div className="diagnostic-metrics font-mono">
            <div className="metric-row">
              <span className="label">Asset:</span>
              <span className="val text-cyan">{selectedToken}-PERP</span>
            </div>
            <div className="metric-row">
              <span className="label">Msgs Recv:</span>
              <span className="val">{msgCount}</span>
            </div>
            <div className="metric-row">
              <span className="label">WS Latency:</span>
              <span className="val text-green">{latency ? `${latency}ms` : '---'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ticker Stats Cards */}
      <div className="grid-cols-5 statistics-cards">
        <div className="card stat-card">
          <div className="card-title">
            <Activity size={16} className="text-cyan" />
            <span>Hyperliquid Price</span>
          </div>
          <div className="card-value font-mono text-cyan-glow">
            {stats ? `$${stats.price.toLocaleString(undefined, { 
              minimumFractionDigits: selectedToken === 'XRP' || selectedToken === 'ADA' ? 4 : 2,
              maximumFractionDigits: selectedToken === 'XRP' || selectedToken === 'ADA' ? 4 : 2
            })}` : 'Loading...'}
          </div>
          <p className="mini-desc text-secondary">Index mark price context</p>
        </div>

        <div className="card stat-card">
          <div className="card-title">
            <Volume2 size={16} className="text-purple" />
            <span>24h Traded Volume</span>
          </div>
          <div className="card-value font-mono text-purple-glow">
            {stats ? formatCompactVal(stats.dayNtlVlm) : 'Loading...'}
          </div>
          <p className="mini-desc text-secondary">Hyperliquid exchange volume</p>
        </div>

        <div className="card stat-card">
          <div className="card-title">
            <Lock size={16} className="text-yellow" />
            <span>Open Interest</span>
          </div>
          <div className="card-value font-mono text-yellow-glow">
            {stats ? formatCompactVal(stats.openInterest * stats.price) : 'Loading...'}
          </div>
          <p className="mini-desc text-secondary">
            {stats ? `${stats.openInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${selectedToken}` : ''}
          </p>
        </div>

        <div className="card stat-card">
          <div className="card-title">
            <Flame size={16} className="trend-up" />
            <span>Funding Rate (1h)</span>
          </div>
          <div className="card-value font-mono trend-up">
            {stats ? `${stats.fundingRate.toFixed(5)}%` : 'Loading...'}
          </div>
          <p className="mini-desc text-secondary">
            {stats ? `Est. Yearly: ${(stats.fundingRate * 24 * 365).toFixed(2)}%` : ''}
          </p>
        </div>

        <div className="card stat-card">
          <div className="card-title">
            <ArrowRightLeft size={16} className="text-gray" />
            <span>Est. Trades (24h)</span>
          </div>
          <div className="card-value font-mono">
            {stats ? stats.tradeCount.toLocaleString() : 'Loading...'}
          </div>
          <p className="mini-desc text-secondary">Calculated trade frequency</p>
        </div>
      </div>

      {/* Main Terminal View Layout */}
      <div className="grid-dashboard terminal-layout">
        
        {/* Left Side: Real-time Live Trades Stream */}
        <div className="card stream-card">
          <div className="card-header">
            <div className="header-left">
              <Activity className="text-cyan pulse" size={18} />
              <h3>Real-Time Trades Feed</h3>
            </div>
            <div className="header-actions">
              <button 
                className={`btn btn-sm ${isPaused ? 'btn-paused' : 'btn-live'}`} 
                onClick={() => setIsPaused(!isPaused)}
                title={isPaused ? 'Resume live feed' : 'Pause live feed'}
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button 
                className="btn btn-sm btn-clear" 
                onClick={handleClearFeed}
                title="Clear current log"
              >
                <Trash2 size={14} />
                Clear
              </button>
            </div>
          </div>

          <div className="table-container stream-container">
            <table className="custom-table live-trades-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th className="align-right">Price</th>
                  <th className="align-right">Size</th>
                  <th className="align-right">Value (USD)</th>
                  <th className="align-center">Side</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((t, idx) => {
                  const valUsd = parseFloat(t.px) * parseFloat(t.sz);
                  const isBuy = t.side === 'B';
                  const sizeDecimals = parseFloat(t.sz) < 0.1 ? 4 : 2;
                  
                  return (
                    <tr key={`${t.time}-${t.px}-${t.sz}-${idx}`} className={valUsd >= whaleThreshold ? 'whale-row-highlight' : ''}>
                      <td className="font-mono text-muted">
                        {new Date(t.time).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        })}.{(t.time % 1000).toString().padStart(3, '0')}
                      </td>
                      <td className="align-right font-mono font-bold">
                        ${parseFloat(t.px).toLocaleString(undefined, { 
                          minimumFractionDigits: selectedToken === 'XRP' || selectedToken === 'ADA' ? 4 : 2,
                          maximumFractionDigits: selectedToken === 'XRP' || selectedToken === 'ADA' ? 4 : 2
                        })}
                      </td>
                      <td className="align-right font-mono text-secondary">
                        {parseFloat(t.sz).toLocaleString(undefined, { minimumFractionDigits: sizeDecimals })} {t.coin}
                      </td>
                      <td className={`align-right font-mono ${valUsd >= whaleThreshold ? 'text-yellow font-bold' : ''}`}>
                        ${valUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="align-center">
                        <span className={`side-badge ${isBuy ? 'buy' : 'sell'}`}>
                          {isBuy ? 'BUY' : 'SELL'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {recentTrades.length === 0 && (
                  <tr>
                    <td colSpan={5} className="no-trades-placeholder">
                      <Wifi size={24} className="pulse" />
                      <span>Connecting to WebSocket, awaiting trade events...</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Whale Block Trades Monitor */}
        <div className="card whale-card">
          <div className="card-header">
            <div className="header-left">
              <Filter className="text-yellow" size={18} />
              <h3>Whale Trade Tracker</h3>
            </div>
            <div className="whale-ratio-badge font-mono">
              &ge; ${(whaleThreshold / 1000).toFixed(0)}k block sizes
            </div>
          </div>

          {/* Whale Filter Threshold Selector */}
          <div className="whale-filters">
            <div className="filter-label text-secondary">Threshold Filter:</div>
            <div className="filter-buttons">
              {[5000, 10000, 25000, 50000, 100000].map((th) => (
                <button
                  key={th}
                  className={`btn-pill font-mono ${whaleThreshold === th ? 'active' : ''}`}
                  onClick={() => {
                    setWhaleThreshold(th);
                    setCustomThreshold('');
                  }}
                >
                  ${(th / 1000).toFixed(0)}k
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <form onSubmit={handleCustomThresholdSubmit} className="custom-threshold-form">
              <input
                type="number"
                placeholder="Custom USD size..."
                value={customThreshold}
                onChange={(e) => setCustomThreshold(e.target.value)}
                className="input-field threshold-input"
              />
              <button type="submit" className="btn btn-primary btn-input-submit">Set</button>
            </form>
          </div>

          {/* Whale Volume Dashboard stats */}
          <div className="whale-volume-tracker">
            <div className="tracker-header">
              <span className="title">Whale Order Volume Share</span>
              <span className="value font-mono">{whaleVolumePct.toFixed(1)}% of total</span>
            </div>
            
            {/* Split Bar */}
            <div className="whale-split-bar">
              <div className="buy-fill" style={{ width: `${whaleBuyPct}%` }} />
              <div className="sell-fill" style={{ width: `${whaleSellPct}%` }} />
            </div>

            <div className="whale-split-labels font-mono">
              <div className="label-buy">
                <span className="dot buy" />
                <span>Buys: ${formatCompactVal(whaleBuyVolume).replace('$', '')} ({whaleBuyPct.toFixed(0)}%)</span>
              </div>
              <div className="label-sell">
                <span className="dot sell" />
                <span>Sells: ${formatCompactVal(whaleSellVolume).replace('$', '')} ({whaleSellPct.toFixed(0)}%)</span>
              </div>
            </div>
          </div>

          {/* Whale Trade Event Feed List */}
          <div className="whale-alerts-feed">
            {whaleTrades.map((t, idx) => {
              const valUsd = parseFloat(t.px) * parseFloat(t.sz);
              const isBuy = t.side === 'B';
              const sizeDec = parseFloat(t.sz) < 0.1 ? 4 : 2;
              const isMega = valUsd >= 100000; // Mega trade indicator
              
              return (
                <div 
                  key={`${t.time}-${t.px}-${t.sz}-${idx}`} 
                  className={`whale-alert-card border-${isBuy ? 'buy' : 'sell'} ${isMega ? 'mega-alert' : ''} ${(idx === 0 && lastWhaleTradeId) ? (isBuy ? 'flash-green-anim' : 'flash-red-anim') : ''}`}
                >
                  <div className="alert-top">
                    <span className={`alert-label ${isBuy ? 'buy' : 'sell'}`}>
                      {isMega ? '🚨 MEGA WHALE ORDER' : '🐋 WHALE BLOCK'}
                    </span>
                    <span className="alert-time font-mono">
                      {new Date(t.time).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="alert-main">
                    <div className="alert-symbol font-mono">{t.coin}</div>
                    <div className="alert-amount font-mono text-yellow-glow">
                      ${valUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="alert-details font-mono text-muted">
                    {parseFloat(t.sz).toLocaleString(undefined, { minimumFractionDigits: sizeDec })} {t.coin} @ ${parseFloat(t.px).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
              );
            })}

            {whaleTrades.length === 0 && (
              <div className="no-whales font-mono">
                <AlertTriangle size={20} className="pulse text-muted" />
                <span>Monitoring feed for trades &ge; ${whaleThreshold.toLocaleString()}...</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Scoped CSS styling for Hyperliquid Hub */}
      <style>{`
        .hyperliquid-hub-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .view-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .title-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(168, 85, 247, 0.08);
          border: 1px solid rgba(168, 85, 247, 0.2);
          color: var(--color-accent);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          font-family: var(--font-display);
          margin-bottom: 8px;
        }

        .icon-glow-purple {
          filter: drop-shadow(0 0 4px var(--color-accent));
        }

        .diagnostic-panel {
          padding: 12px 16px;
          min-width: 240px;
          background: rgba(9, 11, 14, 0.6);
          backdrop-filter: blur(10px);
        }

        .status-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 6px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.connecting {
          background-color: var(--color-warning);
          box-shadow: 0 0 8px var(--color-warning);
          animation: diagnosticPulse 1s infinite alternate;
        }

        .status-dot.connected {
          background-color: var(--color-long);
          box-shadow: 0 0 8px var(--color-long);
        }

        .status-dot.disconnected {
          background-color: var(--color-short);
          box-shadow: 0 0 8px var(--color-short);
        }

        .status-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .diagnostic-metrics {
          font-size: 0.7rem;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .diagnostic-metrics .metric-row {
          display: flex;
          justify-content: space-between;
        }

        .diagnostic-metrics .label {
          color: var(--text-muted);
        }

        .diagnostic-metrics .val {
          color: var(--text-primary);
          font-weight: 600;
        }

        .statistics-cards {
          margin-top: -4px;
        }

        .stat-card {
          padding: 16px;
          background: rgba(13, 15, 20, 0.4);
          backdrop-filter: blur(8px);
        }

        .card-value.text-cyan-glow {
          color: var(--color-info);
          text-shadow: 0 0 8px var(--color-info-glow);
        }

        .card-value.text-purple-glow {
          color: var(--color-accent);
          text-shadow: 0 0 8px var(--color-accent-glow);
        }

        .card-value.text-yellow-glow {
          color: var(--color-warning);
          text-shadow: 0 0 8px rgba(245, 158, 11, 0.15);
        }

        .terminal-layout {
          grid-template-columns: 1.7fr 1.3fr;
        }

        /* Stream Feed Styles */
        .stream-card {
          display: flex;
          flex-direction: column;
          height: 600px;
          background: rgba(13, 15, 20, 0.4);
          backdrop-filter: blur(12px);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 12px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-left h3 {
          font-size: 1.05rem;
          color: var(--text-primary);
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .btn-sm {
          padding: 4px 10px;
          font-size: 0.75rem;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .btn-live {
          background: rgba(6, 182, 212, 0.08);
          border-color: rgba(6, 182, 212, 0.3);
          color: var(--color-info);
        }

        .btn-live:hover {
          background: rgba(6, 182, 212, 0.15);
        }

        .btn-paused {
          background: rgba(245, 158, 11, 0.08);
          border-color: rgba(245, 158, 11, 0.3);
          color: var(--color-warning);
        }

        .btn-paused:hover {
          background: rgba(245, 158, 11, 0.15);
        }

        .btn-clear {
          background: rgba(255, 255, 255, 0.02);
          border-color: var(--border-color);
          color: var(--text-secondary);
        }

        .btn-clear:hover {
          color: var(--text-primary);
          background: var(--border-hover);
        }

        .stream-container {
          flex: 1;
          overflow-y: auto;
          max-height: 520px;
        }

        .live-trades-table {
          font-size: 0.8rem;
        }

        .live-trades-table th {
          padding: 8px 12px;
          position: sticky;
          top: 0;
          background: var(--bg-card);
          z-index: 1;
        }

        .live-trades-table td {
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
        }

        .side-badge {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          text-align: center;
          min-width: 48px;
        }

        .side-badge.buy {
          background: rgba(16, 185, 129, 0.1);
          color: var(--color-long);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .side-badge.sell {
          background: rgba(244, 63, 94, 0.1);
          color: var(--color-short);
          border: 1px solid rgba(244, 63, 94, 0.2);
        }

        .whale-row-highlight {
          background-color: rgba(245, 158, 11, 0.04);
        }

        .whale-row-highlight td {
          border-top: 1px solid rgba(245, 158, 11, 0.15);
          border-bottom: 1px solid rgba(245, 158, 11, 0.15) !important;
        }

        .no-trades-placeholder {
          height: 350px;
          text-align: center;
          vertical-align: middle;
          color: var(--text-muted);
        }

        .no-trades-placeholder svg {
          margin: 0 auto 12px auto;
          color: var(--text-muted);
        }

        .no-trades-placeholder span {
          display: block;
          font-size: 0.8rem;
        }

        /* Whale Card Styles */
        .whale-card {
          display: flex;
          flex-direction: column;
          height: 600px;
          background: rgba(13, 15, 20, 0.4);
          backdrop-filter: blur(12px);
        }

        .whale-ratio-badge {
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.2);
          color: var(--color-warning);
          font-size: 0.7rem;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
        }

        .whale-filters {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border-color);
        }

        .whale-filters .filter-label {
          font-size: 0.75rem;
          font-weight: 500;
        }

        .filter-buttons {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .btn-pill {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-pill:hover {
          color: var(--text-primary);
          border-color: var(--text-secondary);
        }

        .btn-pill.active {
          background: var(--color-warning);
          border-color: transparent;
          color: #06070a;
          font-weight: 700;
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
        }

        .custom-threshold-form {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .threshold-input {
          padding: 6px 12px;
          font-size: 0.8rem;
          height: 32px;
          flex: 1;
        }

        .btn-input-submit {
          padding: 0 12px;
          height: 32px;
          font-size: 0.8rem;
        }

        /* Whale volume stats */
        .whale-volume-tracker {
          padding: 12px 0;
          border-bottom: 1px solid var(--border-color);
        }

        .tracker-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          margin-bottom: 6px;
        }

        .tracker-header .title {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .tracker-header .value {
          color: var(--color-warning);
          font-weight: 700;
        }

        .whale-split-bar {
          display: flex;
          height: 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          overflow: hidden;
          margin-bottom: 6px;
        }

        .whale-split-bar .buy-fill {
          height: 100%;
          background-color: var(--color-long);
          box-shadow: 0 0 6px var(--color-long-glow);
          transition: width 0.3s ease;
        }

        .whale-split-bar .sell-fill {
          height: 100%;
          background-color: var(--color-short);
          box-shadow: 0 0 6px var(--color-short-glow);
          transition: width 0.3s ease;
        }

        .whale-split-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.65rem;
        }

        .whale-split-labels .dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-right: 4px;
        }

        .whale-split-labels .dot.buy {
          background-color: var(--color-long);
        }

        .whale-split-labels .dot.sell {
          background-color: var(--color-short);
        }

        .whale-split-labels .label-buy, .whale-split-labels .label-sell {
          display: flex;
          align-items: center;
        }

        .whale-split-labels .label-buy {
          color: var(--color-long);
        }

        .whale-split-labels .label-sell {
          color: var(--color-short);
        }

        /* Whale alerts feed */
        .whale-alerts-feed {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 380px;
        }

        .whale-alert-card {
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-left: 3px solid transparent;
          border-radius: 8px;
          transition: all var(--transition-fast);
        }

        .whale-alert-card:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: var(--border-hover);
        }

        .whale-alert-card.border-buy {
          border-left-color: var(--color-long);
        }

        .whale-alert-card.border-sell {
          border-left-color: var(--color-short);
        }

        .whale-alert-card.mega-alert {
          background: rgba(245, 158, 11, 0.02);
          border-color: rgba(245, 158, 11, 0.2);
          border-left-color: var(--color-warning);
          animation: whaleGlowPulse 2s infinite alternate;
        }

        .alert-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .alert-label {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .alert-label.buy {
          color: var(--color-long);
        }

        .alert-label.sell {
          color: var(--color-short);
        }

        .alert-time {
          font-size: 0.65rem;
          color: var(--text-muted);
        }

        .alert-main {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }

        .alert-symbol {
          font-weight: 750;
          font-size: 0.95rem;
          color: var(--text-primary);
        }

        .alert-amount {
          font-size: 1.05rem;
          font-weight: 800;
          color: var(--color-warning);
        }

        .alert-details {
          font-size: 0.7rem;
        }

        .no-whales {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 180px;
          color: var(--text-muted);
          font-size: 0.75rem;
          text-align: center;
        }

        /* Animations */
        @keyframes diagnosticPulse {
          0% { box-shadow: 0 0 2px var(--color-warning); }
          100% { box-shadow: 0 0 10px var(--color-warning); }
        }

        @keyframes whaleGlowPulse {
          0% {
            box-shadow: 0 0 4px rgba(245, 158, 11, 0.05);
            border-color: rgba(245, 158, 11, 0.2);
          }
          100% {
            box-shadow: 0 0 12px rgba(245, 158, 11, 0.25);
            border-color: rgba(245, 158, 11, 0.4);
          }
        }

        .pulse {
          animation: pulseIcon 2s infinite alternate;
        }

        @keyframes pulseIcon {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }

        /* Grid responsive fixes */
        @media (max-width: 1200px) {
          .terminal-layout {
            grid-template-columns: 1fr;
          }
          .stream-card, .whale-card {
            height: auto;
            max-height: 550px;
          }
        }
        @media (max-width: 768px) {
          .view-header-row {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }
          .diagnostic-panel {
            min-width: 100%;
            width: 100%;
          }
          .stream-card, .whale-card {
            height: auto;
            max-height: 480px;
          }
        }
      `}</style>
    </div>
  );
};
