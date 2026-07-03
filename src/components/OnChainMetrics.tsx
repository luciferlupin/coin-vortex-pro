/* eslint-disable */
import React, { useState } from 'react';
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
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { getOnChainMetrics } from '../services/apiService';
import type { TokenStats } from '../services/apiService';
import { Activity, Landmark, ShieldCheck, TrendingUp, HelpCircle } from 'lucide-react';

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

interface OnChainMetricsProps {
  selectedToken: string;
  tokenStats: TokenStats | undefined;
  isLightTheme: boolean;
}

type OnChainMetricType = 'mvrv' | 'nupl' | 'sopr' | 'puell' | 'flows' | 'addresses' | 'realized' | 'nvt' | 'reserves';

export const OnChainMetrics: React.FC<OnChainMetricsProps> = ({
  selectedToken,
  tokenStats,
  isLightTheme,
}) => {
  const [activeMetric, setActiveMetric] = useState<OnChainMetricType>('mvrv');
  const [onChainData, setOnChainData] = React.useState<any[]>([]);
  const [loadedToken, setLoadedToken] = useState<string>('');

  React.useEffect(() => {
    if (!tokenStats || (selectedToken === loadedToken && onChainData.length > 0)) return;

    const loadOnChainData = async () => {
      try {
        const data = await getOnChainMetrics(selectedToken, tokenStats.price);
        setOnChainData(data);
        setLoadedToken(selectedToken);
      } catch (error) {
        console.error('Failed to load onchain metrics:', error);
      }
    };
    loadOnChainData();
  }, [selectedToken, tokenStats, loadedToken, onChainData.length]);

  const labels = onChainData.map((d) => d.date);

  // 1. Global Long/Short Ratio
  const mvrvChartData = {
    labels,
    datasets: [
      {
        label: 'Global Long/Short Ratio',
        data: onChainData.map((d) => d.mvrv),
        borderColor: 'rgba(168, 85, 247, 1)', // Purple
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        yAxisID: 'yMetric',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 1,
      },
      {
        label: 'Price (USD)',
        data: onChainData.map((d) => d.price),
        borderColor: 'rgba(6, 182, 212, 0.4)', // Faded Cyan
        backgroundColor: 'transparent',
        yAxisID: 'yPrice',
        tension: 0.3,
        borderWidth: 1.5,
        pointRadius: 0,
      },
    ],
  };

  // 2. Top Accounts L/S Ratio (Formerly NUPL)
  const nuplChartData = {
    labels,
    datasets: [
      {
        label: 'Top Accounts L/S Ratio',
        data: onChainData.map((d) => d.nupl + 1.0),
        borderColor: 'rgba(16, 185, 129, 1)', // Green
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        fill: true,
        yAxisID: 'yMetric',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 1,
      },
      {
        label: 'Price (USD)',
        data: onChainData.map((d) => d.price),
        borderColor: isLightTheme ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)',
        backgroundColor: 'transparent',
        yAxisID: 'yPrice',
        tension: 0.3,
        borderWidth: 1.5,
        pointRadius: 0,
      },
    ],
  };

  // 3. Top Positions L/S Ratio (Formerly SOPR)
  const soprChartData = {
    labels,
    datasets: [
      {
        label: 'Top Positions L/S Ratio',
        data: onChainData.map((d) => d.sopr),
        borderColor: 'rgba(6, 182, 212, 1)', // Cyan
        backgroundColor: 'rgba(6, 182, 212, 0.08)',
        fill: true,
        yAxisID: 'yMetric',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 1,
      },
      {
        label: 'Price (USD)',
        data: onChainData.map((d) => d.price),
        borderColor: isLightTheme ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)',
        backgroundColor: 'transparent',
        yAxisID: 'yPrice',
        tension: 0.3,
        borderWidth: 1.5,
        pointRadius: 0,
      },
    ],
  };

  // 4. Taker Buy/Sell Ratio (Formerly Puell Multiple)
  const puellChartData = {
    labels,
    datasets: [
      {
        label: 'Taker Buy/Sell Ratio',
        data: onChainData.map((d) => d.puellMultiple),
        borderColor: 'rgba(245, 158, 11, 1)', // Amber
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        fill: true,
        yAxisID: 'yMetric',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 1,
      },
      {
        label: 'Price (USD)',
        data: onChainData.map((d) => d.price),
        borderColor: isLightTheme ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)',
        backgroundColor: 'transparent',
        yAxisID: 'yPrice',
        tension: 0.3,
        borderWidth: 1.5,
        pointRadius: 0,
      },
    ],
  };

  // 5. Taker Net Flows (Formerly Exchange Flows)
  const flowsChartData: any = {
    labels,
    datasets: [
      {
        label: 'Taker Net Flow (USD Millions)',
        data: onChainData.map((d) => d.exchangeFlow),
        backgroundColor: onChainData.map((d) => 
          d.exchangeFlow >= 0 ? 'rgba(16, 185, 129, 0.65)' : 'rgba(244, 63, 94, 0.65)'
        ),
        borderColor: onChainData.map((d) => 
          d.exchangeFlow >= 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(244, 63, 94, 1)'
        ),
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'yMetric',
      },
      {
        label: 'Price (USD)',
        data: onChainData.map((d) => d.price),
        type: 'line' as const,
        borderColor: isLightTheme ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.25)',
        backgroundColor: 'transparent',
        yAxisID: 'yPrice',
        tension: 0.3,
        borderWidth: 1.5,
        pointRadius: 0,
      },
    ],
  };

  // 6. Taker Trade Activity (Formerly Active Addresses)
  const addressesChartData = {
    labels,
    datasets: [
      {
        label: 'Taker Trade Activity (Volume proxy)',
        data: onChainData.map((d) => d.activeAddresses),
        borderColor: 'rgba(6, 182, 212, 1)',
        backgroundColor: 'rgba(6, 182, 212, 0.05)',
        fill: true,
        yAxisID: 'yMetric',
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 1.5,
      },
      {
        label: 'Price (USD)',
        data: onChainData.map((d) => d.price),
        borderColor: 'rgba(168, 85, 247, 0.3)',
        backgroundColor: 'transparent',
        yAxisID: 'yPrice',
        tension: 0.3,
        borderWidth: 1.5,
        pointRadius: 0,
      },
    ],
  };

  // 7. Spot vs Average Cost Basis (Formerly Realized Price)
  const realizedChartData = {
    labels,
    datasets: [
      {
        label: 'Spot Price (USD)',
        data: onChainData.map((d) => d.price),
        borderColor: 'rgba(6, 182, 212, 1)', // Cyan
        backgroundColor: 'transparent',
        yAxisID: 'yPrice',
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 1,
      },
      {
        label: 'Average Cost Basis (USD)',
        data: onChainData.map((d) => d.realizedPrice),
        borderColor: 'rgba(168, 85, 247, 1)', // Purple
        backgroundColor: 'rgba(168, 85, 247, 0.05)',
        fill: true,
        yAxisID: 'yPrice',
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 1,
      },
    ],
  };

  // 8. Position Turnover (Formerly NVT Ratio)
  const nvtChartData = {
    labels,
    datasets: [
      {
        label: 'Position Turnover Ratio',
        data: onChainData.map((d) => d.nvtRatio),
        borderColor: 'rgba(236, 72, 153, 1)', // Pink
        backgroundColor: 'rgba(236, 72, 153, 0.08)',
        fill: true,
        yAxisID: 'yMetric',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 1,
      },
      {
        label: 'Price (USD)',
        data: onChainData.map((d) => d.price),
        borderColor: isLightTheme ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)',
        backgroundColor: 'transparent',
        yAxisID: 'yPrice',
        tension: 0.3,
        borderWidth: 1.5,
        pointRadius: 0,
      },
    ],
  };

  // 9. Open Interest (USD) (Formerly Exchange Reserves)
  const reservesChartData = {
    labels,
    datasets: [
      {
        label: 'Open Interest (USD)',
        data: onChainData.map((d) => d.exchangeReserves),
        borderColor: 'rgba(245, 158, 11, 1)', // Amber
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        fill: true,
        yAxisID: 'yMetric',
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 1.5,
      },
      {
        label: 'Price (USD)',
        data: onChainData.map((d) => d.price),
        borderColor: isLightTheme ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)',
        backgroundColor: 'transparent',
        yAxisID: 'yPrice',
        tension: 0.3,
        borderWidth: 1.5,
        pointRadius: 0,
      },
    ],
  };

  const chartOptions: any = {
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
        borderColor: 'rgba(255, 255, 255, 0.08)',
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
      yMetric: {
        type: 'linear',
        display: activeMetric !== 'realized',
        grid: {
          color: isLightTheme ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.03)',
        },
        ticks: {
          color: activeMetric === 'mvrv' ? 'rgba(168, 85, 247, 1)' :
                 activeMetric === 'nupl' ? 'var(--color-long)' :
                 activeMetric === 'sopr' ? 'rgba(6, 182, 212, 1)' :
                 activeMetric === 'puell' ? 'var(--color-warning)' :
                 activeMetric === 'addresses' ? 'rgba(6, 182, 212, 1)' :
                 activeMetric === 'nvt' ? 'rgba(236, 72, 153, 1)' :
                 activeMetric === 'reserves' ? 'var(--color-warning)' : '#9ca3af',
          callback: (value: any) => {
            if (activeMetric === 'addresses') {
              const valNum = Number(value);
              if (valNum >= 1e6) return `${(valNum / 1e6).toFixed(1)}M`;
              if (valNum >= 1e3) return `${(valNum / 1e3).toFixed(0)}k`;
              return valNum.toLocaleString();
            }
            if (activeMetric === 'flows') return `${value >= 0 ? '+' : ''}${Number(value).toFixed(1)}M`;
            if (activeMetric === 'sopr' || activeMetric === 'nupl' || activeMetric === 'mvrv' || activeMetric === 'puell') {
              return Number(value).toFixed(2);
            }
            if (activeMetric === 'reserves') {
              const valNum = Number(value);
              if (valNum >= 1e9) return `${(valNum / 1e9).toFixed(1)}B`;
              if (valNum >= 1e6) return `${(valNum / 1e6).toFixed(0)}M`;
              if (valNum >= 1e3) return `${(valNum / 1e3).toFixed(0)}k`;
              return valNum.toLocaleString();
            }
            return Number(value).toFixed(2);
          },
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
          callback: (value: any) => `$${Number(value).toLocaleString()}`,
          font: { family: 'JetBrains Mono', size: 10 },
        },
      },
    },
  };

  if (!tokenStats || onChainData.length === 0) return <div className="loading">Loading positioning metrics...</div>;

  const latestPoint = onChainData[onChainData.length - 1];

  return (
    <div className="onchain-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">Binance Futures Positioning Metrics ({tokenStats.symbol})</h2>
          <p className="view-subtitle text-secondary">
            Examines real positioning data: accounts & positions long/short ratios, taker buy/sell volumes, and open interest.
          </p>
        </div>
        <div className="onchain-menu">
          <button
            onClick={() => setActiveMetric('mvrv')}
            className={`metric-btn ${activeMetric === 'mvrv' ? 'active' : ''}`}
          >
            Global Long/Short
          </button>
          <button
            onClick={() => setActiveMetric('nupl')}
            className={`metric-btn ${activeMetric === 'nupl' ? 'active' : ''}`}
          >
            Top Accounts Ratio
          </button>
          <button
            onClick={() => setActiveMetric('sopr')}
            className={`metric-btn ${activeMetric === 'sopr' ? 'active' : ''}`}
          >
            Top Positions Ratio
          </button>
          <button
            onClick={() => setActiveMetric('puell')}
            className={`metric-btn ${activeMetric === 'puell' ? 'active' : ''}`}
          >
            Taker Ratio
          </button>
          <button
            onClick={() => setActiveMetric('flows')}
            className={`metric-btn ${activeMetric === 'flows' ? 'active' : ''}`}
          >
            Taker Net Flow
          </button>
          <button
            onClick={() => setActiveMetric('addresses')}
            className={`metric-btn ${activeMetric === 'addresses' ? 'active' : ''}`}
          >
            Taker Trade Activity
          </button>
          <button
            onClick={() => setActiveMetric('realized')}
            className={`metric-btn ${activeMetric === 'realized' ? 'active' : ''}`}
          >
            Average Cost Basis
          </button>
          <button
            onClick={() => setActiveMetric('nvt')}
            className={`metric-btn ${activeMetric === 'nvt' ? 'active' : ''}`}
          >
            Position Turnover
          </button>
          <button
            onClick={() => setActiveMetric('reserves')}
            className={`metric-btn ${activeMetric === 'reserves' ? 'active' : ''}`}
          >
            Open Interest (USD)
          </button>
        </div>
      </div>

      {/* Overview Cards for Active Metric */}
      <div className="grid-cols-4 metrics-overview">
        {/* Metric 1 */}
        <div className="card">
          <div className="card-title">
            <ShieldCheck size={16} className="trend-up" />
            <span>Global Long/Short</span>
          </div>
          <div className="card-value font-mono text-purple">
            {latestPoint?.mvrv.toFixed(2)}
          </div>
          <p className="mini-desc text-secondary">
            {latestPoint?.mvrv > 1.2 ? 'Bullish Positioning' : latestPoint?.mvrv < 0.95 ? 'Bearish Positioning' : 'Balanced Sentiment'}
          </p>
        </div>

        {/* Metric 2 */}
        <div className="card">
          <div className="card-title">
            <TrendingUp size={16} className="trend-up" />
            <span>Top Accounts L/S</span>
          </div>
          <div className="card-value font-mono text-long">
            {(latestPoint?.nupl + 1.0).toFixed(2)}
          </div>
          <p className="mini-desc text-secondary">
            {latestPoint?.nupl + 1.0 > 1.25 ? 'Whales Net Long' : latestPoint?.nupl + 1.0 < 0.95 ? 'Whales Net Short' : 'Whales Neutral'}
          </p>
        </div>

        {/* Metric 3 */}
        <div className="card">
          <div className="card-title">
            <Activity size={16} className="trend-info" />
            <span>Top Positions L/S</span>
          </div>
          <div className="card-value font-mono text-cyan">
            {latestPoint?.sopr.toFixed(2)}
          </div>
          <p className="mini-desc text-secondary">
            {latestPoint?.sopr > 1.05 ? 'Leveraged Long Bias' : latestPoint?.sopr < 0.95 ? 'Leveraged Short Bias' : 'Balanced Leverage'}
          </p>
        </div>

        {/* Metric 4 */}
        <div className="card">
          <div className="card-title">
            <Landmark size={16} className="trend-down" />
            <span>Taker Net Flow</span>
          </div>
          <div className={`card-value font-mono ${latestPoint?.exchangeFlow >= 0 ? 'trend-up' : 'trend-down'}`}>
            {latestPoint?.exchangeFlow > 0 ? '+' : ''}
            {latestPoint?.exchangeFlow.toFixed(1)}M
          </div>
          <p className="mini-desc text-secondary">
            {latestPoint?.exchangeFlow >= 0 ? 'Aggressive Buying' : 'Aggressive Selling'}
          </p>
        </div>
      </div>

      {/* Main Chart Rendering */}
      <div className="card chart-display-card">
        <div className="chart-wrapper-large">
          {activeMetric === 'mvrv' && (
            <Line data={mvrvChartData} options={chartOptions} />
          )}
          {activeMetric === 'nupl' && (
            <Line data={nuplChartData} options={chartOptions} />
          )}
          {activeMetric === 'sopr' && (
            <Line data={soprChartData} options={chartOptions} />
          )}
          {activeMetric === 'puell' && (
            <Line data={puellChartData} options={chartOptions} />
          )}
          {activeMetric === 'flows' && (
            <Bar data={flowsChartData as any} options={chartOptions as any} />
          )}
          {activeMetric === 'addresses' && (
            <Line data={addressesChartData} options={chartOptions} />
          )}
          {activeMetric === 'realized' && (
            <Line data={realizedChartData} options={chartOptions} />
          )}
          {activeMetric === 'nvt' && (
            <Line data={nvtChartData} options={chartOptions} />
          )}
          {activeMetric === 'reserves' && (
            <Line data={reservesChartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Explainer Panel */}
      <div className="card explainer-details-card">
        <div className="explanation-header">
          <HelpCircle size={20} className="text-purple" />
          <h4>Metric Definitions & Interpretations</h4>
        </div>
        <div className="explainer-desc-grid">
          <div className="expl-box">
            <strong>Global Long/Short Ratio</strong>
            <p className="text-secondary">
              The ratio of total long accounts to short accounts globally on Binance Futures. A ratio above 1.0 indicates net bullish positioning among all accounts.
            </p>
          </div>
          <div className="expl-box">
            <strong>Top Accounts Ratio</strong>
            <p className="text-secondary">
              The long/short account ratio of top traders on Binance. This represents the positioning and sentiment of major accounts/whales.
            </p>
          </div>
          <div className="expl-box">
            <strong>Top Positions Ratio</strong>
            <p className="text-secondary">
              The long/short ratio of top traders' actual position sizes. Gauges where the largest leveraged capital is currently allocated.
            </p>
          </div>
          <div className="expl-box">
            <strong>Taker Ratio</strong>
            <p className="text-secondary">
              The ratio of taker buy volume to taker sell volume. Gauges market aggression; values above 1.0 signify buyers hitting ask prices.
            </p>
          </div>
          <div className="expl-box">
            <strong>Taker Net Flow</strong>
            <p className="text-secondary">
              Net value of aggressive market orders (Taker Buys minus Taker Sells) converted to USD. Shows direct buying vs selling volume pressure.
            </p>
          </div>
          <div className="expl-box">
            <strong>Taker Trade Activity</strong>
            <p className="text-secondary">
              Estimated count of taker transactions/trade participation. Helps measure liquidity, interest level, and volume momentum.
            </p>
          </div>
          <div className="expl-box">
            <strong>Average Cost Basis</strong>
            <p className="text-secondary">
              The estimated entry price or cost basis of open futures contracts. Acts as a key baseline for identifying systemic support and resistance.
            </p>
          </div>
          <div className="expl-box">
            <strong>Position Turnover</strong>
            <p className="text-secondary">
              Dividing outstanding contract value by transaction volumes. Measures how quickly positions are trading hands relative to total outstanding interest.
            </p>
          </div>
          <div className="expl-box">
            <strong>Open Interest (USD)</strong>
            <p className="text-secondary">
              The total USD value of outstanding active futures contracts. Rising open interest indicates new funds entering, reinforcing the current trend.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .onchain-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .onchain-menu {
          display: flex;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 3.5px;
          flex-wrap: wrap;
          gap: 4px;
        }
        @media (max-width: 768px) {
          .onchain-menu {
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            padding: 6px;
          }
          .metric-btn {
            flex-shrink: 0;
            white-space: nowrap;
          }
        }
        .metric-btn {
          border: none;
          background: transparent;
          color: var(--text-secondary);
          padding: 6px 14px;
          border-radius: 6px;
          font-family: var(--font-display);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .metric-btn:hover {
          color: var(--text-primary);
        }
        .metric-btn.active {
          background: var(--bg-card-hover);
          color: var(--color-accent);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }
        
        .metrics-overview {
          margin-top: 4px;
        }
        .mini-desc {
          font-size: 0.7rem;
          margin-top: 6px;
        }
        .text-purple {
          color: var(--color-accent);
        }
        .text-cyan {
          color: var(--color-info);
        }
        .text-long {
          color: var(--color-long);
        }
        
        .chart-display-card {
          padding: 24px;
        }
        .chart-wrapper-large {
          height: 380px;
          position: relative;
        }
        
        .explainer-details-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .explainer-desc-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 768px) {
          .explainer-desc-grid {
            grid-template-columns: 1fr;
          }
        }
        .expl-box {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          padding: 14px;
          border-radius: 8px;
        }
        .expl-box strong {
          font-size: 0.85rem;
          color: var(--text-primary);
          font-family: var(--font-display);
        }
        .expl-box p {
          font-size: 0.75rem;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
};
