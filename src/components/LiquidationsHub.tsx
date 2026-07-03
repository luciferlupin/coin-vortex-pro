/* eslint-disable */
import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  getLiquidationHistory,
  getExchangeLiquidationShare,
  getTimeframeLiquidations,
  getExchangeComparativeLiquidations,
} from '../services/apiService';
import type { 
  LiquidationHistoryPoint, 
  LiquidationEvent,
  TimeframeLiquidations,
  ExchangeLiquidationRow,
} from '../services/apiService';
import { Flame, ShieldAlert, Award, TrendingDown, RefreshCw, Layers, Clock } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface LiquidationsHubProps {
  selectedToken: string;
  isLightTheme: boolean;
  liquidations: LiquidationEvent[];
}

export const LiquidationsHub: React.FC<LiquidationsHubProps> = ({
  selectedToken,
  isLightTheme,
  liquidations,
}) => {
  const [historyData, setHistoryData] = useState<LiquidationHistoryPoint[]>([]);
  const [exchangeShare, setExchangeShare] = useState<any[]>([]);
  const [timeframeStats, setTimeframeStats] = useState<TimeframeLiquidations[]>([]);
  const [exchangeComp, setExchangeComp] = useState<ExchangeLiquidationRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const hist = await getLiquidationHistory(selectedToken);
        const exch = await getExchangeLiquidationShare();
        const tfStats = await getTimeframeLiquidations(selectedToken);
        const exchComp = await getExchangeComparativeLiquidations(selectedToken);
        setHistoryData(hist);
        setExchangeShare(exch);
        setTimeframeStats(tfStats);
        setExchangeComp(exchComp);
      } catch (e) {
        console.error('Failed to load liquidation details:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedToken]);

  // Aggregate stats
  const total24hLiqs = liquidations.reduce((sum, item) => sum + item.amountUsd, 0);
  const longs24h = liquidations.filter(item => item.side === 'long').reduce((sum, item) => sum + item.amountUsd, 0);
  const shorts24h = liquidations.filter(item => item.side === 'short').reduce((sum, item) => sum + item.amountUsd, 0);
  
  const largestLiq = liquidations.reduce((max, item) => {
    return !max || item.amountUsd > max.amountUsd ? item : max;
  }, null as LiquidationEvent | null);

  // Chart configs
  const barChartData = {
    labels: historyData.map(d => d.date),
    datasets: [
      {
        label: 'Longs Liquidated (USD Thousands)',
        data: historyData.map(d => d.longs),
        backgroundColor: 'rgba(16, 185, 129, 0.65)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Shorts Liquidated (USD Thousands)',
        data: historyData.map(d => d.shorts),
        backgroundColor: 'rgba(244, 63, 94, 0.65)',
        borderColor: 'rgba(244, 63, 94, 1)',
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  };

  const barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: isLightTheme ? '#0f172a' : '#f3f4f6',
          font: { family: 'Outfit', size: 11 }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: isLightTheme ? '#ffffff' : '#0d0f14',
        titleColor: isLightTheme ? '#0f172a' : '#f3f4f6',
        bodyColor: isLightTheme ? '#475569' : '#9ca3af',
        borderColor: isLightTheme ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        callbacks: {
          label: (context) => ` ${context.dataset.label?.split(' ')[0]}: $${Number(context.raw).toLocaleString()}k`
        }
      }
    },
    scales: {
      x: {
        grid: { color: isLightTheme ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: isLightTheme ? '#475569' : '#9ca3af', font: { size: 10 } }
      },
      y: {
        grid: { color: isLightTheme ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.03)' },
        ticks: { 
          color: isLightTheme ? '#475569' : '#9ca3af',
          font: { family: 'JetBrains Mono', size: 10 },
          callback: (val) => `$${Number(val).toLocaleString()}k`
        }
      }
    }
  };

  return (
    <div className="liquidations-hub-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">Advanced Liquidation Analytics</h2>
          <p className="view-subtitle text-secondary">
            Analyze historical and real-time leverage flush-outs to monitor broker margins and market capitulations.
          </p>
        </div>
      </div>

      {/* Overview stats cards */}
      <div className="grid-cols-4 statistics-cards">
        <div className="card">
          <div className="card-title">
            <Flame size={16} className="trend-down" />
            <span>Total 24h Liquidations</span>
          </div>
          <div className="card-value font-mono trend-down">
            ${(total24hLiqs / 1e3).toFixed(1)}K
          </div>
          <p className="mini-desc text-secondary">Aggregate leverage liquidations</p>
        </div>

        <div className="card">
          <div className="card-title">
            <TrendingDown size={16} className="trend-up" />
            <span>Longs Liquidated</span>
          </div>
          <div className="card-value font-mono trend-up">
            ${(longs24h / 1e3).toFixed(1)}K
          </div>
          <p className="mini-desc text-secondary">{total24hLiqs > 0 ? ((longs24h / total24hLiqs) * 100).toFixed(0) : 0}% of total volume</p>
        </div>

        <div className="card">
          <div className="card-title">
            <TrendingDown size={16} className="trend-down" />
            <span>Shorts Liquidated</span>
          </div>
          <div className="card-value font-mono trend-down">
            ${(shorts24h / 1e3).toFixed(1)}K
          </div>
          <p className="mini-desc text-secondary">{total24hLiqs > 0 ? ((shorts24h / total24hLiqs) * 100).toFixed(0) : 0}% of total volume</p>
        </div>

        <div className="card">
          <div className="card-title">
            <Award size={16} className="text-purple" />
            <span>Largest Liquidation</span>
          </div>
          <div className="card-value font-mono text-purple">
            {largestLiq ? `$${(largestLiq.amountUsd / 1e3).toFixed(1)}k` : 'N/A'}
          </div>
          <p className="mini-desc text-secondary">{largestLiq ? `${largestLiq.symbol} on ${largestLiq.exchange}` : 'Monitoring feed...'}</p>
        </div>
      </div>

      {/* Timeframe Liquidations Grid */}
      <div className="timeframe-grid-header">
        <Clock size={18} className="text-cyan font-bold" />
        <h3 className="section-title">Timeframe Leverage Liquidations ({selectedToken})</h3>
      </div>
      <div className="grid-cols-4 timeframe-grid">
        {timeframeStats.map((tfStat) => {
          const total = tfStat.totalUsd;
          const longsPct = total > 0 ? (tfStat.longsUsd / total) * 100 : 50;
          const shortsPct = 100 - longsPct;
          return (
            <div key={tfStat.tf} className="card tf-card">
              <div className="tf-title font-mono font-bold">{tfStat.tf} Window</div>
              <div className="tf-total font-mono text-cyan-glow">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="tf-bar-wrap">
                <div className="tf-bar-labels font-mono">
                  <span className="trend-up">L: {longsPct.toFixed(0)}%</span>
                  <span className="trend-down">S: {shortsPct.toFixed(0)}%</span>
                </div>
                <div className="tf-bar-track">
                  <div className="tf-bar-long" style={{ width: `${longsPct}%` }}></div>
                  <div className="tf-bar-short" style={{ width: `${shortsPct}%` }}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts area */}
      <div className="grid-dashboard charts-layout">
        {/* Cumulative History Bar Chart */}
        <div className="card chart-card">
          <div className="card-header">
            <Flame className="trend-down" size={18} />
            <h3>Cumulative Liquidation History</h3>
          </div>
          <div className="chart-wrapper">
            {loading ? (
              <div className="loading-card-contents">Syncing historical charts...</div>
            ) : (
              <Bar data={barChartData} options={barChartOptions} />
            )}
          </div>
        </div>

        {/* Exchange Share Breakdown */}
        <div className="card exchange-share-card">
          <div className="card-header">
            <ShieldAlert className="text-purple" size={18} />
            <h3>Exchange Share Ratio (%)</h3>
          </div>
          <div className="exchange-shares-wrapper">
            {exchangeShare.map((exch) => (
              <div key={exch.name} className="share-row">
                <div className="share-row-meta">
                  <div className="share-row-name">
                    <span className="dot" style={{ backgroundColor: exch.color }} />
                    <span className="name">{exch.name}</span>
                  </div>
                  <span className="value font-mono font-bold">{exch.value}%</span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${exch.value}%`, backgroundColor: exch.color }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Exchange Comparative Table & Alerts Feed Grid */}
      <div className="grid-dashboard bottom-analytics-layout">
        {/* Exchange Comparative Table */}
        <div className="card exchange-table-card">
          <div className="card-header">
            <Layers className="text-purple" size={18} />
            <h3>Multi-Exchange Liquidations Grid ({selectedToken})</h3>
          </div>
          <div className="table-container">
            <table className="custom-table exchange-comp-table">
              <thead>
                <tr>
                  <th>Exchange</th>
                  <th className="align-right">Total Vol</th>
                  <th className="align-right">Longs</th>
                  <th className="align-right">Shorts</th>
                  <th className="align-right">L/S Ratio</th>
                </tr>
              </thead>
              <tbody>
                {exchangeComp.map((row) => {
                  const ratio = row.shortsUsd > 0 ? (row.longsUsd / row.shortsUsd).toFixed(2) : '1.00';
                  return (
                    <tr key={row.exchange}>
                      <td className="exch-name-cell font-bold">{row.exchange}</td>
                      <td className="align-right font-mono font-bold">${row.totalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="align-right font-mono trend-up">${row.longsUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="align-right font-mono trend-down">${row.shortsUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className={`align-right font-mono ${parseFloat(ratio) >= 1 ? 'trend-up' : 'trend-down'}`}>{ratio}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Big Alert logs feed */}
        <div className="card mega-liquidations-card">
          <div className="card-header">
            <ShieldAlert className="trend-down" size={18} />
            <h3>High-Value Alerts (&gt; $50K)</h3>
          </div>
          <div className="alerts-feed-wrapper">
          {liquidations.filter(l => l.amountUsd >= 50000).map((liq) => {
            const isLong = liq.side === 'long';
            return (
              <div key={liq.id} className={`alert-box border-${liq.side}`}>
                <div className="alert-badge-wrap">
                  <span className={`alert-side-badge ${isLong ? 'bg-long' : 'bg-short'}`}>
                    ALERT: {liq.side.toUpperCase()} FLUSH
                  </span>
                  <span className="time-badge font-mono">
                    {new Date(liq.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="alert-content-meta">
                  <span className="symbol font-mono font-bold">{liq.symbol}</span>
                  <span className="amount font-mono">${liq.amountUsd.toLocaleString()}</span>
                  <span className="price text-secondary font-mono">@ ${liq.price.toLocaleString()}</span>
                  <span className="exchange-tag font-mono">{liq.exchange}</span>
                </div>
              </div>
            );
          })}
            {liquidations.filter(l => l.amountUsd >= 50000).length === 0 && (
              <div className="no-alerts">
                <RefreshCw size={20} className="pulse-icon" />
                <span>Awaiting high-value leverage liquidations...</span>
              </div>
            )}
        </div>
      </div>
    </div>

      <style>{`
        .liquidations-hub-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .mini-desc {
          font-size: 0.7rem;
          margin-top: 4px;
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
        .chart-wrapper {
          height: 300px;
          position: relative;
        }
        .loading-card-contents {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        /* Exchange share */
        .exchange-shares-wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
          justify-content: center;
          height: 100%;
        }
        .share-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .share-row-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
        }
        .share-row-name {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .share-row-name .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .font-bold {
          font-weight: 700;
        }
        .progress-bar-container {
          height: 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          border-radius: 4px;
        }

        /* Alerts feed */
        .alerts-feed-wrapper {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 300px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .alert-box {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          border-left: 4px solid transparent;
        }
        .alert-box.border-long {
          border-left-color: var(--color-long);
          animation: pulseGreen 1s ease-out;
        }
        .alert-box.border-short {
          border-left-color: var(--color-short);
          animation: pulseRed 1s ease-out;
        }
        @keyframes pulseGreen {
          0% { background-color: rgba(16, 185, 129, 0.08); }
          100% { background-color: transparent; }
        }
        @keyframes pulseRed {
          0% { background-color: rgba(244, 63, 94, 0.08); }
          100% { background-color: transparent; }
        }
        .alert-badge-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .alert-side-badge {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          color: white;
        }
        .bg-long {
          background-color: var(--color-long);
        }
        .bg-short {
          background-color: var(--color-short);
        }
        .time-badge {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .alert-content-meta {
          display: flex;
          gap: 20px;
          font-size: 0.85rem;
          flex-wrap: wrap;
        }
        .alert-content-meta .symbol {
          font-weight: 700;
          color: var(--text-primary);
        }
        .alert-content-meta .amount {
          color: var(--color-warning);
          font-weight: 600;
        }
        .alert-content-meta .exchange-tag {
          margin-left: auto;
          color: var(--color-accent);
          font-size: 0.75rem;
          background: rgba(168, 85, 247, 0.08);
          border: 1px solid rgba(168, 85, 247, 0.2);
          padding: 1px 6px;
          border-radius: 4px;
        }
        .no-alerts {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: var(--text-muted);
          font-size: 0.85rem;
          gap: 12px;
        }
        .pulse-icon {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        .timeframe-grid-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          margin-bottom: 2px;
        }
        .timeframe-grid-header .section-title {
          font-size: 1.1rem;
          color: var(--text-primary);
        }
        .timeframe-grid {
          margin-bottom: 8px;
        }
        .tf-card {
          padding: 16px;
          background: var(--bg-card);
        }
        .tf-title {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .tf-total {
          font-size: 1.35rem;
          font-weight: 750;
          margin: 6px 0;
          color: var(--text-primary);
        }
        .tf-bar-wrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .tf-bar-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.65rem;
          font-weight: 600;
        }
        .tf-bar-track {
          display: flex;
          height: 4px;
          border-radius: 2px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05);
        }
        .tf-bar-long {
          background-color: var(--color-long);
        }
        .tf-bar-short {
          background-color: var(--color-short);
        }
        
        .bottom-analytics-layout {
          margin-top: 10px;
        }
        .exchange-table-card {
          display: flex;
          flex-direction: column;
        }
        .exchange-comp-table th {
          font-size: 0.75rem;
          text-transform: uppercase;
        }
        .exch-name-cell {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};
