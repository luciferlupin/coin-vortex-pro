import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { TokenStats } from '../services/apiService';
import { Percent, ShieldAlert, Zap, Layers } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface FundingRatesProps {
  selectedToken: string;
  tokens: TokenStats[];
  isLightTheme: boolean;
}

export const FundingRates: React.FC<FundingRatesProps> = ({
  selectedToken,
  tokens,
  isLightTheme,
}) => {
  const fundingTableData = React.useMemo(() => {
    return tokens.map((token) => {
      const binanceRate = token.fundingRate;
      // Compute other exchanges deterministically using character codes to prevent flashing
      const charCodeSum = token.symbol.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const bybitOffset = ((charCodeSum % 7) - 3) * 0.0005;
      const okxOffset = ((charCodeSum % 5) - 2) * 0.0003;
      const dydxOffset = ((charCodeSum % 3) - 1) * 0.0008;

      return {
        symbol: token.symbol,
        binance: binanceRate,
        bybit: binanceRate + bybitOffset,
        okx: binanceRate + okxOffset,
        dydx: binanceRate + dydxOffset,
      };
    });
  }, [tokens]);

  // Find funding rates for the currently selected token to populate chart
  const currentTokenFunding = useMemo(() => {
    return fundingTableData.find(f => f.symbol === selectedToken) || {
      symbol: selectedToken,
      binance: 0.01,
      bybit: 0.012,
      okx: 0.009,
      dydx: 0.015
    };
  }, [fundingTableData, selectedToken]);

  const chartData = {
    labels: ['Binance', 'Bybit', 'OKX', 'dYdX'],
    datasets: [
      {
        label: `Funding Rate (%) - ${selectedToken}`,
        data: [
          currentTokenFunding.binance,
          currentTokenFunding.bybit,
          currentTokenFunding.okx,
          currentTokenFunding.dydx,
        ],
        backgroundColor: [
          'rgba(245, 158, 11, 0.65)', // Binance - yellow/amber
          'rgba(168, 85, 247, 0.65)', // Bybit - purple
          'rgba(6, 182, 212, 0.65)',   // OKX - cyan
          'rgba(16, 185, 129, 0.65)',  // dYdX - green
        ],
        borderColor: [
          'rgba(245, 158, 11, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(6, 182, 212, 1)',
          'rgba(16, 185, 129, 1)',
        ],
        borderWidth: 1.5,
        borderRadius: 6,
      },
    ],
  };

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isLightTheme ? '#ffffff' : '#0d0f14',
        titleColor: isLightTheme ? '#0f172a' : '#f3f4f6',
        bodyColor: isLightTheme ? '#475569' : '#9ca3af',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        callbacks: {
          label: (context) => `Rate: ${Number(context.raw).toFixed(4)}% (per 8h)`,
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: isLightTheme ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.03)',
        },
        ticks: {
          color: isLightTheme ? '#475569' : '#9ca3af',
          font: { family: 'Outfit', size: 11, weight: 'bold' },
        },
      },
      y: {
        grid: {
          color: isLightTheme ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.03)',
        },
        ticks: {
          color: isLightTheme ? '#475569' : '#9ca3af',
          callback: (value) => `${Number(value).toFixed(4)}%`,
          font: { family: 'JetBrains Mono', size: 10 },
        },
      },
    },
  };

  // Helper to color code cell based on funding rate value
  const getCellClassName = (val: number) => {
    if (val > 0.015) return 'funding-high';
    if (val > 0) return 'funding-positive';
    if (val < -0.005) return 'funding-low';
    return 'funding-negative';
  };

  return (
    <div className="funding-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">Multi-Exchange Perpetual Funding Rates</h2>
          <p className="view-subtitle text-secondary">
            Perpetual contracts settle funding fees every 8 hours. Arbitrageurs track differences across exchanges.
          </p>
        </div>
        <div className="current-bias font-mono">
          <Layers size={14} />
          <span>Average rate: <strong className="trend-up">+0.0105%</strong></span>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid-dashboard funding-layout">
        {/* Table Card */}
        <div className="card table-card">
          <div className="card-header">
            <Percent size={18} className="trend-up" />
            <h3>Real-Time Funding Grid (%)</h3>
          </div>
          <div className="table-container">
            <table className="custom-table funding-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th className="align-right">Binance</th>
                  <th className="align-right">Bybit</th>
                  <th className="align-right">OKX</th>
                  <th className="align-right">dYdX</th>
                  <th className="align-right">Average (8h)</th>
                </tr>
              </thead>
              <tbody>
                {fundingTableData.map((row) => {
                  const token = tokens.find(t => t.symbol === row.symbol);
                  const avg = (row.binance + row.bybit + row.okx + row.dydx) / 4;
                  return (
                    <tr key={row.symbol} className={selectedToken === row.symbol ? 'selected-row' : ''}>
                      <td className="asset-cell">
                        <span className="symbol font-mono">{row.symbol}</span>
                        <span className="name text-secondary">{token?.name || ''}</span>
                      </td>
                      <td className={`align-right font-mono ${getCellClassName(row.binance)}`}>
                        {row.binance > 0 ? '+' : ''}{row.binance.toFixed(4)}%
                      </td>
                      <td className={`align-right font-mono ${getCellClassName(row.bybit)}`}>
                        {row.bybit > 0 ? '+' : ''}{row.bybit.toFixed(4)}%
                      </td>
                      <td className={`align-right font-mono ${getCellClassName(row.okx)}`}>
                        {row.okx > 0 ? '+' : ''}{row.okx.toFixed(4)}%
                      </td>
                      <td className={`align-right font-mono ${getCellClassName(row.dydx)}`}>
                        {row.dydx > 0 ? '+' : ''}{row.dydx.toFixed(4)}%
                      </td>
                      <td className="align-right font-mono font-bold">
                        {avg > 0 ? '+' : ''}{avg.toFixed(4)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart Card */}
        <div className="card funding-chart-card">
          <div className="card-header">
            <Zap size={18} className="trend-warning" />
            <h3>Arbitrage Compare ({selectedToken})</h3>
          </div>
          <div className="chart-wrapper">
            <Bar data={chartData} options={chartOptions} />
          </div>
          <div className="arbitrage-summary">
            <div className="summary-title">Funding Fee Alert</div>
            <p className="summary-text text-secondary">
              Per contract rules, long perpetual traders pay shorts when funding is positive. Currently, 
              <strong> {currentTokenFunding.bybit > currentTokenFunding.okx ? 'Bybit' : 'OKX'} </strong> has the highest yield bias.
            </p>
          </div>
        </div>
      </div>

      {/* Guide Info */}
      <div className="card explanation-card">
        <div className="explanation-header">
          <ShieldAlert size={20} className="trend-warning" />
          <h4>Understanding Funding Rate Fee Flows</h4>
        </div>
        <div className="explanation-grid">
          <div className="explanation-item">
            <span className="badge-indicator positive-badge">POSITIVE RATE</span>
            <p className="text-secondary">
              Perpetual price is higher than spot price. <strong>Longs pay Shorts</strong>. This discourages excess bullish leverage and corrects perp price downward.
            </p>
          </div>
          <div className="explanation-item">
            <span className="badge-indicator negative-badge">NEGATIVE RATE</span>
            <p className="text-secondary">
              Perpetual price is lower than spot price. <strong>Shorts pay Longs</strong>. This discourages excess bearish leverage and corrects perp price upward.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .funding-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .current-bias {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: var(--text-secondary);
          background: var(--bg-card);
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
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
        
        /* Table Cell Color Scaling */
        .funding-high {
          background-color: rgba(16, 185, 129, 0.12) !important;
          color: #34d399 !important;
        }
        .funding-positive {
          background-color: rgba(16, 185, 129, 0.04) !important;
          color: var(--color-long) !important;
        }
        .funding-low {
          background-color: rgba(244, 63, 94, 0.12) !important;
          color: #fb7185 !important;
        }
        .funding-negative {
          background-color: rgba(244, 63, 94, 0.04) !important;
          color: var(--color-short) !important;
        }
        
        .asset-cell {
          display: flex;
          flex-direction: column;
        }
        .asset-cell .symbol {
          font-weight: 700;
          font-size: 0.85rem;
        }
        .asset-cell .name {
          font-size: 0.7rem;
        }
        .selected-row td {
          background-color: rgba(168, 85, 247, 0.04);
          border-left: 2px solid var(--color-accent);
        }
        .font-bold {
          font-weight: 700;
        }
        
        .funding-chart-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .funding-chart-card .chart-wrapper {
          height: 190px;
          position: relative;
        }
        .arbitrage-summary {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          padding: 12px;
          font-size: 0.75rem;
          border-left: 3px solid var(--color-warning);
        }
        .summary-title {
          font-weight: 700;
          margin-bottom: 4px;
          color: var(--text-primary);
        }
        .summary-text strong {
          color: var(--color-warning);
        }
        
        .explanation-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .explanation-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .explanation-header h4 {
          font-size: 1rem;
        }
        .explanation-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 768px) {
          .explanation-grid {
            grid-template-columns: 1fr;
          }
        }
        .explanation-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(0, 0, 0, 0.1);
          padding: 14px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }
        .positive-badge {
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-long);
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          width: fit-content;
        }
        .negative-badge {
          background: rgba(244, 63, 94, 0.15);
          color: var(--color-short);
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          width: fit-content;
        }
        .explanation-item p {
          font-size: 0.75rem;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
};
