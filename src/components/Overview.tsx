/* eslint-disable */
import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, Flame, DollarSign, BarChart2, ShieldAlert } from 'lucide-react';
import { TradingViewWidget } from './TradingViewWidget';
import { getOnChainMetrics } from '../services/apiService';
import type { TokenStats, LiquidationEvent } from '../services/apiService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface OverviewProps {
  selectedToken: string;
  tokenStats: TokenStats | undefined;
  liquidations: LiquidationEvent[];
  isLightTheme: boolean;
}

export const Overview: React.FC<OverviewProps> = ({
  selectedToken,
  tokenStats,
  liquidations,
  isLightTheme,
}) => {
  const [historicalData, setHistoricalData] = useState<any>(null);
  const [chartType, setChartType] = useState<'derivatives' | 'interactive'>('derivatives');
  const [loadedToken, setLoadedToken] = useState<string>('');

  useEffect(() => {
    // Guard: wait until tokenStats is available before computing chart data
    if (!tokenStats || (selectedToken === loadedToken && historicalData)) return;

    const loadChartData = async () => {
      try {
        const points = await getOnChainMetrics(selectedToken);
        const labels = points.map((p) => p.date);
        const prices = points.map((p) => p.price);
        
        // Scale active addresses to mock open interest variations
        const oiValues = points.map((p) => (p.price * (tokenStats.openInterest || 1000000000) * (p.mvrv / 1.5)) / tokenStats.price);

        setHistoricalData({
          labels,
          datasets: [
            {
              label: 'Price (USD)',
              data: prices,
              borderColor: 'rgba(6, 182, 212, 1)', // Cyan
              backgroundColor: 'rgba(6, 182, 212, 0.1)',
              fill: true,
              yAxisID: 'yPrice',
              tension: 0.3,
              borderWidth: 2,
              pointRadius: 1,
            },
            {
              label: 'Open Interest (USD)',
              data: oiValues,
              borderColor: 'rgba(168, 85, 247, 1)', // Purple
              backgroundColor: 'rgba(168, 85, 247, 0.05)',
              fill: false,
              yAxisID: 'yOI',
              tension: 0.3,
              borderWidth: 2,
              pointRadius: 1,
            },
          ],
        });
        setLoadedToken(selectedToken);
      } catch (error) {
        console.error('Failed to load chart data:', error);
      }
    };

    loadChartData();
  }, [selectedToken, tokenStats, loadedToken, historicalData]);

  if (!tokenStats) return <div className="loading">Loading overview data...</div>;

  const totalLiq24h = liquidations.reduce((sum, item) => sum + item.amountUsd, 0);
  const longsLiq = liquidations.filter((item) => item.side === 'long').reduce((sum, item) => sum + item.amountUsd, 0);
  const shortsLiq = liquidations.filter((item) => item.side === 'short').reduce((sum, item) => sum + item.amountUsd, 0);

  const longPercent = totalLiq24h > 0 ? (longsLiq / totalLiq24h) * 100 : 50;
  const shortPercent = totalLiq24h > 0 ? (shortsLiq / totalLiq24h) * 100 : 50;

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isLightTheme ? '#0f172a' : '#f3f4f6',
          font: { family: 'Outfit', size: 12 },
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: isLightTheme ? '#ffffff' : '#0d0f14',
        titleColor: isLightTheme ? '#0f172a' : '#f3f4f6',
        bodyColor: isLightTheme ? '#475569' : '#9ca3af',
        borderColor: isLightTheme ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: isLightTheme ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.03)',
        },
        ticks: {
          color: isLightTheme ? '#475569' : '#9ca3af',
          font: { size: 10 },
        },
      },
      yPrice: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: {
          color: isLightTheme ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.03)',
        },
        ticks: {
          color: 'rgba(6, 182, 212, 1)',
          callback: (value) => `$${Number(value).toLocaleString()}`,
          font: { family: 'JetBrains Mono', size: 10 },
        },
      },
      yOI: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false, // only want grid lines for Left axis
        },
        ticks: {
          color: 'rgba(168, 85, 247, 1)',
          callback: (value) => `$${(Number(value) / 1e9).toFixed(1)}B`,
          font: { family: 'JetBrains Mono', size: 10 },
        },
      },
    },
  };

  return (
    <div className="overview-container">
      {/* Title */}
      <div className="view-header">
        <h2 className="view-title">{tokenStats.name} ({tokenStats.symbol}) Derivatives Overview</h2>
        <span className="last-updated">Real-time simulation active</span>
      </div>

      {/* Stats Cards */}
      <div className="grid-cols-4 stat-cards">
        {/* Card 1: Price */}
        <div className="card">
          <div className="card-title">
            <DollarSign size={16} />
            <span>Mark Price</span>
          </div>
          <div className="card-value font-mono">
            ${tokenStats.price.toLocaleString(undefined, { minimumFractionDigits: tokenStats.symbol === 'XRP' || tokenStats.symbol === 'ADA' ? 4 : 2 })}
          </div>
          <div className={`card-change font-mono ${tokenStats.change24h >= 0 ? 'trend-up' : 'trend-down'}`}>
            {tokenStats.change24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {tokenStats.change24h >= 0 ? '+' : ''}{tokenStats.change24h.toFixed(2)}% (24h)
          </div>
        </div>

        {/* Card 2: Open Interest */}
        <div className="card">
          <div className="card-title">
            <BarChart2 size={16} />
            <span>Open Interest (OI)</span>
          </div>
          <div className="card-value font-mono text-purple-glow">
            ${(tokenStats.openInterest / 1e9).toFixed(2)}B
          </div>
          <div className={`card-change font-mono ${tokenStats.openInterestChange24h >= 0 ? 'trend-up' : 'trend-down'}`}>
            {tokenStats.openInterestChange24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {tokenStats.openInterestChange24h >= 0 ? '+' : ''}{tokenStats.openInterestChange24h.toFixed(2)}% (24h)
          </div>
        </div>

        {/* Card 3: Funding Rate */}
        <div className="card">
          <div className="card-title">
            <ShieldAlert size={16} />
            <span>Predicted Funding (8h)</span>
          </div>
          <div className="card-value font-mono text-cyan-glow">
            {(tokenStats.fundingRate).toFixed(4)}%
          </div>
          <div className="card-change font-mono text-secondary">
            Annualized: {(tokenStats.fundingRate * 3 * 365).toFixed(2)}%
          </div>
        </div>

        {/* Card 4: Liquidations Summary */}
        <div className="card">
          <div className="card-title">
            <Flame size={16} className="trend-down" />
            <span>24h Liquidations</span>
          </div>
          <div className="card-value font-mono trend-down">
            ${(totalLiq24h / 1e3).toFixed(1)}K
          </div>
          <div className="liq-ratio-bar-wrapper">
            <div className="liq-labels font-mono">
              <span className="trend-up">L: {longPercent.toFixed(0)}%</span>
              <span className="trend-down">S: {shortPercent.toFixed(0)}%</span>
            </div>
            <div className="liq-progress-bar">
              <div className="liq-long-fill" style={{ width: `${longPercent}%` }}></div>
              <div className="liq-short-fill" style={{ width: `${shortPercent}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Feed Layout */}
      <div className="grid-dashboard charts-feed-layout">
        {/* Chart Column */}
        <div className="card chart-card">
          <div className="chart-header">
            <div className="chart-header-left">
              <h3>{chartType === 'derivatives' ? 'Historical Open Interest & Price' : `${selectedToken} Interactive Market Chart`}</h3>
              {chartType === 'derivatives' && <span className="legend-desc">Price (Cyan) vs Open Interest (Purple)</span>}
            </div>
            
            {/* Chart Type Selector Toggle */}
            <div className="chart-type-selector">
              <button 
                onClick={() => setChartType('derivatives')} 
                className={`chart-type-btn ${chartType === 'derivatives' ? 'active' : ''}`}
              >
                Derivatives
              </button>
              <button 
                onClick={() => setChartType('interactive')} 
                className={`chart-type-btn ${chartType === 'interactive' ? 'active' : ''}`}
              >
                Interactive
              </button>
            </div>
          </div>
          <div className="chart-wrapper">
            {chartType === 'derivatives' ? (
              historicalData ? (
                <Line data={historicalData} options={chartOptions} />
              ) : (
                <div className="loading-chart">Loading chart engine...</div>
              )
            ) : (
              <TradingViewWidget symbol={selectedToken} isLightTheme={isLightTheme} />
            )}
          </div>
        </div>

        {/* Liquidations Feed Column */}
        <div className="card feed-card">
          <div className="feed-header">
            <div className="title-area">
              <Flame className="glow-icon-red" size={18} />
              <h3>Live Liquidations Feed</h3>
            </div>
            <span className="pulse-dot"></span>
          </div>
          <div className="feed-list">
            {liquidations.slice(0, 10).map((liq) => {
              const isLong = liq.side === 'long';
              return (
                <div key={liq.id} className={`feed-item border-${liq.side}`}>
                  <div className="feed-item-left">
                    <span className={`side-badge ${isLong ? 'bg-long' : 'bg-short'}`}>
                      {liq.side.toUpperCase()}
                    </span>
                    <span className="token-symbol font-mono">{liq.symbol}</span>
                    <span className="exchange-label">{liq.exchange}</span>
                  </div>
                  <div className="feed-item-right font-mono">
                    <span className="liq-val">${liq.amountUsd.toLocaleString()}</span>
                    <span className="liq-price">@ ${liq.price.toLocaleString(undefined, { minimumFractionDigits: liq.symbol === 'XRP' || liq.symbol === 'ADA' ? 4 : 2 })}</span>
                  </div>
                </div>
              );
            })}
            {liquidations.length === 0 && (
              <div className="no-feed-data">Awaiting market liquidations...</div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .overview-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .view-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .view-title {
          font-size: 1.5rem;
          color: var(--text-primary);
        }
        .last-updated {
          font-size: 0.75rem;
          color: var(--text-muted);
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          padding: 4px 10px;
          border-radius: 20px;
        }
        .text-purple-glow {
          color: var(--color-accent);
          text-shadow: 0 0 8px var(--color-accent-glow);
        }
        .text-cyan-glow {
          color: var(--color-info);
          text-shadow: 0 0 8px var(--color-info-glow);
        }
        .card-change {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          margin-top: 10px;
          font-weight: 500;
        }
        .liq-ratio-bar-wrapper {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 10px;
        }
        .liq-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .liq-progress-bar {
          display: flex;
          height: 6px;
          border-radius: 3px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05);
        }
        .liq-long-fill {
          background-color: var(--color-long);
        }
        .liq-short-fill {
          background-color: var(--color-short);
        }
        
        .charts-feed-layout {
          margin-top: 4px;
        }
        .chart-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .chart-header-left {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .chart-header h3 {
          font-size: 1.1rem;
        }
        .chart-type-selector {
          display: flex;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 2.5px;
        }
        .chart-type-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
          font-family: var(--font-display);
          transition: all var(--transition-fast);
        }
        .chart-type-btn:hover {
          color: var(--text-primary);
        }
        .chart-type-btn.active {
          background: var(--bg-card-hover);
          color: var(--color-accent);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        }
        .legend-desc {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .chart-wrapper {
          height: 320px;
          position: relative;
        }
        .loading-chart {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        
        .feed-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 410px;
        }
        .feed-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .feed-header h3 {
          font-size: 1.1rem;
        }
        .title-area {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .glow-icon-red {
          color: var(--color-short);
          filter: drop-shadow(0 0 4px var(--color-short-glow));
        }
        .pulse-dot {
          width: 8px;
          height: 8px;
          background-color: var(--color-long);
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulse 1.6s infinite;
        }
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
        .feed-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
          flex: 1;
          padding-right: 4px;
        }
        .feed-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 6px;
          border-left: 3px solid transparent;
          transition: background-color var(--transition-fast);
        }
        .feed-item:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .border-long {
          border-left-color: var(--color-long);
        }
        .border-short {
          border-left-color: var(--color-short);
        }
        .feed-item-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .side-badge {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          color: #ffffff;
        }
        .bg-long {
          background-color: var(--color-long);
        }
        .bg-short {
          background-color: var(--color-short);
        }
        .token-symbol {
          font-weight: 600;
          font-size: 0.85rem;
        }
        .exchange-label {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .feed-item-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .liq-val {
          font-size: 0.85rem;
          font-weight: 600;
        }
        .liq-price {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }
        .no-feed-data {
          text-align: center;
          padding: 40px;
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        @media (max-width: 768px) {
          .view-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .view-title {
            font-size: 1.25rem;
          }
          .chart-wrapper {
            height: 260px;
          }
          .feed-card {
            max-height: 350px;
          }
        }
      `}</style>
    </div>
  );
};
