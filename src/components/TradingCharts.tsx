import React, { useState } from 'react';
import { TradingViewWidget } from './TradingViewWidget';
import { LayoutGrid, Square, TrendingUp } from 'lucide-react';

interface TradingChartsProps {
  selectedToken: string;
  isLightTheme: boolean;
}

export const TradingCharts: React.FC<TradingChartsProps> = ({
  selectedToken,
  isLightTheme,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
  const trackedCoins = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE'];

  return (
    <div className="trading-charts-container">
      {/* View Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">Interactive Trading Terminals</h2>
          <p className="view-subtitle text-secondary">
            Monitor real-time price feeds with advanced charting widgets, drawing tools, and timeframes.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="view-mode-selector">
          <button
            onClick={() => setViewMode('grid')}
            className={`mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
            title="Multi-Chart Grid"
          >
            <LayoutGrid size={16} />
            <span>Grid View</span>
          </button>
          <button
            onClick={() => setViewMode('single')}
            className={`mode-btn ${viewMode === 'single' ? 'active' : ''}`}
            title="Single Main Chart"
          >
            <Square size={16} />
            <span>Single View</span>
          </button>
        </div>
      </div>

      {/* Main Chart Canvas */}
      {viewMode === 'grid' ? (
        <div className="charts-grid-layout">
          {trackedCoins.map((coin) => (
            <div key={coin} className="card chart-grid-card">
              <div className="grid-card-header">
                <div className="header-label">
                  <TrendingUp size={14} className="trend-icon" />
                  <h4>{coin} / USDT Terminal</h4>
                </div>
                <span className="exchange-badge font-mono">Binance</span>
              </div>
              <div className="grid-chart-wrapper">
                <TradingViewWidget symbol={coin} isLightTheme={isLightTheme} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card single-chart-card">
          <div className="single-card-header">
            <div className="header-label">
              <TrendingUp size={16} className="trend-icon" />
              <h3>{selectedToken} / USDT Interactive Terminal</h3>
            </div>
            <span className="exchange-badge font-mono">Binance Futures</span>
          </div>
          <div className="single-chart-wrapper">
            <TradingViewWidget symbol={selectedToken} isLightTheme={isLightTheme} />
          </div>
        </div>
      )}

      <style>{`
        .trading-charts-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          width: 100%;
        }
        .view-mode-selector {
          display: flex;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 3px;
          gap: 4px;
        }
        .mode-btn {
          border: none;
          background: transparent;
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: 6px;
          font-family: var(--font-display);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all var(--transition-fast);
        }
        .mode-btn:hover {
          color: var(--text-primary);
        }
        .mode-btn.active {
          background: var(--bg-card-hover);
          color: var(--color-accent);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        /* Grid Layout */
        .charts-grid-layout {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
          gap: 20px;
        }
        @media (max-width: 900px) {
          .charts-grid-layout {
            grid-template-columns: 1fr;
          }
        }
        .chart-grid-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
          background: var(--bg-card);
        }
        .grid-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 8px;
        }
        .header-label {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .trend-icon {
          color: var(--color-accent);
        }
        .grid-card-header h4 {
          font-size: 0.85rem;
          color: var(--text-primary);
        }
        .exchange-badge {
          font-size: 0.65rem;
          background: rgba(168, 85, 247, 0.08);
          border: 1px solid rgba(168, 85, 247, 0.2);
          color: var(--color-accent);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .grid-chart-wrapper {
          height: 300px;
          border-radius: 6px;
          overflow: hidden;
        }

        /* Single Chart Layout */
        .single-chart-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 18px;
        }
        .single-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
        }
        .single-card-header h3 {
          font-size: 1.1rem;
          color: var(--text-primary);
        }
        .single-chart-wrapper {
          height: 550px;
          border-radius: 8px;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};
