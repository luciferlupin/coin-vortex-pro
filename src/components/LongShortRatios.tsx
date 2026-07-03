/* eslint-disable */
import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getTimeframeRatios } from '../services/apiService';
import type { TokenStats } from '../services/apiService';
import { ArrowUpDown, Flame, TrendingUp, HelpCircle } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface LongShortRatiosProps {
  selectedToken: string;
  tokenStats: TokenStats | undefined;
  isLightTheme: boolean;
}

export const LongShortRatios: React.FC<LongShortRatiosProps> = ({
  selectedToken,
  tokenStats,
  isLightTheme,
}) => {
  const [timeframeData, setTimeframeData] = React.useState<any[]>([]);

  React.useEffect(() => {
    const loadTimeframeRatios = async () => {
      try {
        const data = await getTimeframeRatios(selectedToken);
        setTimeframeData(data);
      } catch (error) {
        console.error('Failed to load timeframe ratios:', error);
      }
    };
    loadTimeframeRatios();
  }, [selectedToken]);

  // Simulated historical ratio data for the line chart
  const historicalRatioChart = useMemo(() => {
    const dates = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
    // Ratios fluctuating around tokenStats.longRatio
    const base = tokenStats?.longRatio || 51.4;
    const ratioData = dates.map((_, i) => base + (Math.sin(i) * 1.5) + (Math.cos(i) * 0.2));
    
    // Scale spot price similarly
    const priceData = dates.map((_, i) => {
      const pBase = tokenStats?.price || 67000;
      return pBase * (0.99 + (i * 0.002) + (Math.sin(i) * 0.005));
    });

    return {
      labels: dates,
      datasets: [
        {
          label: 'Long Ratio (%)',
          data: ratioData,
          borderColor: 'rgba(16, 185, 129, 1)', // Longs (Green)
          backgroundColor: 'transparent',
          yAxisID: 'yRatio',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 2,
        },
        {
          label: 'Price (USD)',
          data: priceData,
          borderColor: isLightTheme ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)', // Muted line
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          yAxisID: 'yPrice',
          tension: 0.3,
          borderWidth: 1.5,
          pointRadius: 0,
        },
      ],
    };
  }, [tokenStats]);

  if (!tokenStats) return <div className="loading">Loading ratios...</div>;

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isLightTheme ? '#0f172a' : '#f3f4f6',
          font: { family: 'Outfit', size: 11 },
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
      yRatio: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: {
          color: isLightTheme ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.03)',
        },
        ticks: {
          color: 'var(--color-long)',
          callback: (value) => `${Number(value).toFixed(1)}%`,
          font: { family: 'JetBrains Mono', size: 10 },
        },
      },
      yPrice: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: isLightTheme ? '#475569' : '#6b7280',
          callback: (value) => `$${Number(value).toLocaleString()}`,
          font: { family: 'JetBrains Mono', size: 10 },
        },
      },
    },
  };

  return (
    <div className="ratios-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">{tokenStats.symbol} Long/Short Sentiment Ratio</h2>
          <p className="view-subtitle text-secondary">
            Compares accounts/positions taking long perpetual exposure against shorts.
          </p>
        </div>
        <div className="skew-indicator font-mono">
          <span className={tokenStats.longRatio >= 50 ? 'trend-up' : 'trend-down'}>
            Bias: {tokenStats.longRatio >= 50 ? 'BULLISH' : 'BEARISH'} ({tokenStats.longRatio.toFixed(1)}% Long)
          </span>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid-dashboard ratios-layout">
        {/* Horizontal Stacked Bars */}
        <div className="card timeframe-ratios-card">
          <div className="card-header">
            <ArrowUpDown size={18} className="trend-up" />
            <h3>Timeframe Breakdowns (Bids vs Asks)</h3>
          </div>
          <div className="timeframe-list">
            {timeframeData.map((row) => {
              return (
                <div key={row.timeframe} className="tf-row">
                  <div className="tf-label font-mono font-bold">{row.timeframe}</div>
                  <div className="tf-bar-container">
                    <div
                      className="tf-bar long-bar"
                      style={{ width: `${row.longs}%` }}
                    >
                      <span className="percent font-mono">{row.longs.toFixed(1)}%</span>
                    </div>
                    <div
                      className="tf-bar short-bar"
                      style={{ width: `${row.shorts}%` }}
                    >
                      <span className="percent font-mono">{row.shorts.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Line Chart comparing against Price */}
        <div className="card ratio-chart-card">
          <div className="card-header">
            <TrendingUp size={18} className="trend-up" />
            <h3>Historical Sentiment Shift vs Price</h3>
          </div>
          <div className="chart-wrapper">
            <Line data={historicalRatioChart} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Exchange distribution grids */}
      <div className="card exchange-breakdown-card">
        <div className="card-header">
          <Flame size={18} className="trend-down" />
          <h3>Exchange Accounts vs Top Traders (24h)</h3>
        </div>
        
        <div className="exchange-grids">
          {/* Exchange Item 1: Binance */}
          <div className="exch-item">
            <div className="exch-meta">
              <span className="exch-name">Binance Accounts</span>
              <span className="exch-ratio font-mono trend-up">1.12 Long/Short</span>
            </div>
            <div className="exch-bar-wrapper">
              <div className="exch-fill long-fill" style={{ width: '52.8%' }}>52.8%</div>
              <div className="exch-fill short-fill" style={{ width: '47.2%' }}>47.2%</div>
            </div>
          </div>

          {/* Exchange Item 2: Binance Top Traders */}
          <div className="exch-item">
            <div className="exch-meta">
              <span className="exch-name">Binance Top Traders (Positions)</span>
              <span className="exch-ratio font-mono trend-up">1.34 Long/Short</span>
            </div>
            <div className="exch-bar-wrapper">
              <div className="exch-fill long-fill" style={{ width: '57.3%' }}>57.3%</div>
              <div className="exch-fill short-fill" style={{ width: '42.7%' }}>42.7%</div>
            </div>
          </div>

          {/* Exchange Item 3: Bybit */}
          <div className="exch-item">
            <div className="exch-meta">
              <span className="exch-name">Bybit Accounts</span>
              <span className="exch-ratio font-mono trend-down">0.98 Long/Short</span>
            </div>
            <div className="exch-bar-wrapper">
              <div className="exch-fill long-fill" style={{ width: '49.5%' }}>49.5%</div>
              <div className="exch-fill short-fill" style={{ width: '50.5%' }}>50.5%</div>
            </div>
          </div>

          {/* Exchange Item 4: OKX */}
          <div className="exch-item">
            <div className="exch-meta">
              <span className="exch-name">OKX Accounts</span>
              <span className="exch-ratio font-mono trend-up">1.04 Long/Short</span>
            </div>
            <div className="exch-bar-wrapper">
              <div className="exch-fill long-fill" style={{ width: '51.0%' }}>51.0%</div>
              <div className="exch-fill short-fill" style={{ width: '49.0%' }}>49.0%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card explanation-card">
        <div className="explanation-header">
          <HelpCircle size={20} className="text-cyan" />
          <h4>How to interpret Long/Short ratios in derivative trading:</h4>
        </div>
        <p className="explanation-details text-secondary">
          When the Long/Short ratio is **extremely high** (e.g. &gt;1.5), it means the retail market or top traders are heavily positioned for prices to rise. While bullish, this creates a target for market makers to push prices down to trigger liquidation points (long squeeze). Conversly, an **extremely low** ratio indicates heavy shorting, exposing shorts to being squeezed upwards.
        </p>
      </div>

      <style>{`
        .ratios-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .skew-indicator {
          background: var(--bg-card);
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          font-size: 0.8rem;
          font-weight: 700;
        }
        
        .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .card-header h3 {
          font-size: 1.1rem;
        }
        
        /* Timeframe ratio bar styles */
        .timeframe-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .tf-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .tf-label {
          width: 40px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .tf-bar-container {
          flex: 1;
          display: flex;
          height: 28px;
          border-radius: 6px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
        }
        .tf-bar {
          display: flex;
          align-items: center;
          padding: 0 10px;
          font-size: 0.75rem;
          font-weight: 700;
          transition: width 0.3s ease;
        }
        .long-bar {
          background-color: rgba(16, 185, 129, 0.2);
          color: var(--color-long);
          border-right: 1px solid rgba(16, 185, 129, 0.3);
        }
        .short-bar {
          background-color: rgba(244, 63, 94, 0.2);
          color: var(--color-short);
          justify-content: flex-end;
        }
        
        .ratio-chart-card .chart-wrapper {
          height: 270px;
          position: relative;
        }
        
        /* Exchange breakdowns */
        .exchange-grids {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 768px) {
          .exchange-grids {
            grid-template-columns: 1fr;
          }
        }
        .exch-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          padding: 12px;
          border-radius: 8px;
        }
        .exch-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .exch-name {
          color: var(--text-primary);
        }
        .exch-ratio {
          font-size: 0.7rem;
        }
        .exch-bar-wrapper {
          display: flex;
          height: 20px;
          border-radius: 4px;
          overflow: hidden;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .exch-fill {
          display: flex;
          align-items: center;
          padding: 0 8px;
        }
        .long-fill {
          background-color: var(--color-long);
          color: #ffffff;
        }
        .short-fill {
          background-color: var(--color-short);
          color: #ffffff;
          justify-content: flex-end;
        }
        
        .explanation-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .explanation-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .explanation-details {
          font-size: 0.8rem;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
};
