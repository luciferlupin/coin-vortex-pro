import React from 'react';
import { Search, Sun, Moon, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import type { TokenStats } from '../services/apiService';

interface HeaderProps {
  tokens: TokenStats[];
  selectedToken: string;
  onSelectToken: (symbol: string) => void;
  isLightTheme: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tokens,
  selectedToken,
  onSelectToken,
  isLightTheme,
  onToggleTheme,
}) => {
  return (
    <header className="header-container">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="logo-section">
          <Layers className="logo-icon" size={24} />
          <span className="logo-text">CoinVortex</span>
          <span className="badge">PRO</span>
        </div>

        {/* Global Market Stats Bar */}
        <div className="global-stats-bar">
          <div className="stat-item">
            <span className="label">BTC Dominance:</span>
            <span className="value font-mono">56.42%</span>
          </div>
          <div className="stat-item">
            <span className="label">24h Vol:</span>
            <span className="value font-mono">$64.82B</span>
          </div>
          <div className="stat-item">
            <span className="label">Total Open Interest:</span>
            <span className="value font-mono text-purple">$31.54B</span>
          </div>
        </div>

        {/* User controls */}
        <div className="user-controls">
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <select
              value={selectedToken}
              onChange={(e) => onSelectToken(e.target.value)}
              className="token-dropdown"
            >
              {tokens.map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol} - {t.name}
                </option>
              ))}
            </select>
          </div>

          <button onClick={onToggleTheme} className="theme-toggle-btn" aria-label="Toggle theme">
            {isLightTheme ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>

      {/* Ticker Tape */}
      <div className="ticker-tape">
        <div className="ticker-scroll">
          {/* Double the list to make seamless scrolling */}
          {[...tokens, ...tokens].map((token, index) => {
            const isUp = token.change24h >= 0;
            return (
              <div
                key={`${token.symbol}-${index}`}
                className={`ticker-item ${selectedToken === token.symbol ? 'active' : ''}`}
                onClick={() => onSelectToken(token.symbol)}
              >
                <span className="ticker-symbol font-mono">{token.symbol}</span>
                <span className="ticker-price font-mono">
                  ${token.price.toLocaleString(undefined, { minimumFractionDigits: token.symbol === 'XRP' || token.symbol === 'ADA' ? 4 : 2 })}
                </span>
                <span className={`ticker-change font-mono ${isUp ? 'trend-up' : 'trend-down'}`}>
                  {isUp ? <TrendingUp size={12} style={{ marginRight: 2 }} /> : <TrendingDown size={12} style={{ marginRight: 2 }} />}
                  {isUp ? '+' : ''}{token.change24h.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .header-container {
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-sidebar);
        }
        .top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 24px;
          height: 64px;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo-icon {
          color: var(--color-accent);
          filter: drop-shadow(0 0 6px rgba(168, 85, 247, 0.6));
        }
        .logo-text {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 1.35rem;
          letter-spacing: -0.5px;
          color: var(--text-primary);
        }
        .badge {
          font-size: 0.65rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--color-accent), var(--color-info));
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }
        .global-stats-bar {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        @media (max-width: 900px) {
          .global-stats-bar {
            display: none;
          }
        }
        .stat-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
        }
        .stat-item .label {
          color: var(--text-secondary);
        }
        .stat-item .value {
          font-weight: 600;
        }
        .text-purple {
          color: var(--color-accent);
        }
        .user-controls {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .search-box {
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-icon {
          position: absolute;
          left: 10px;
          color: var(--text-secondary);
          pointer-events: none;
        }
        .token-dropdown {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 6px 12px 6px 32px;
          color: var(--text-primary);
          font-family: var(--font-sans);
          font-weight: 500;
          font-size: 0.85rem;
          outline: none;
          cursor: pointer;
          transition: border-color var(--transition-fast);
        }
        .token-dropdown:focus {
          border-color: var(--color-accent);
        }
        .theme-toggle-btn {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .theme-toggle-btn:hover {
          border-color: var(--text-secondary);
          background: var(--bg-card-hover);
        }
        
        /* Ticker tape styles */
        .ticker-tape {
          background: rgba(0, 0, 0, 0.15);
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          overflow: hidden;
          white-space: nowrap;
          height: 36px;
          display: flex;
          align-items: center;
        }
        .ticker-scroll {
          display: inline-flex;
          animation: scrollTicker 30s linear infinite;
        }
        .ticker-scroll:hover {
          animation-play-state: paused;
        }
        .ticker-item {
          display: inline-flex;
          align-items: center;
          padding: 0 20px;
          font-size: 0.8rem;
          border-right: 1px solid var(--border-color);
          cursor: pointer;
          height: 36px;
          transition: background-color var(--transition-fast);
        }
        .ticker-item:hover {
          background: var(--bg-card-hover);
        }
        .ticker-item.active {
          background: rgba(168, 85, 247, 0.08);
          border-bottom: 2px solid var(--color-accent);
        }
        .ticker-symbol {
          font-weight: 700;
          color: var(--text-primary);
          margin-right: 8px;
        }
        .ticker-price {
          color: var(--text-secondary);
          margin-right: 8px;
        }
        .ticker-change {
          display: flex;
          align-items: center;
          font-size: 0.75rem;
          font-weight: 600;
        }
      `}</style>
    </header>
  );
};
