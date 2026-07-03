import React, { useState, useEffect } from 'react';
import { getOptionsMarketData } from '../services/apiService';
import type { OptionsData } from '../services/apiService';
import { Layers, Activity, ShieldAlert, Award, TrendingUp } from 'lucide-react';

interface OptionsMarketProps {
  selectedToken: string;
  currentPrice: number | undefined;
}

export const OptionsMarket: React.FC<OptionsMarketProps> = ({
  selectedToken,
  currentPrice,
}) => {
  const [optionsData, setOptionsData] = useState<OptionsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadOptions = async () => {
      const isInitial = !optionsData;
      if (isInitial) setLoading(true);
      try {
        const data = await getOptionsMarketData(selectedToken, currentPrice);
        setOptionsData(data);
      } catch (e) {
        console.error('Failed to load options metrics:', e);
      } finally {
        if (isInitial) setLoading(false);
      }
    };
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedToken, currentPrice]);

  if (loading || !optionsData) {
    return <div className="loading">Syncing options market metrics...</div>;
  }

  // Sentiment mapping based on Put/Call ratio
  // Standard rules: < 0.7 = Bullish, 0.7 - 0.9 = Neutral, > 0.9 = Bearish
  const pcr = optionsData.putCallRatio;
  const sentiment = pcr < 0.7 ? 'Strong Bullish Bias' : pcr < 0.9 ? 'Moderate Bullish' : pcr < 1.1 ? 'Neutral' : 'Bearish bias';
  const sentimentColor = pcr < 0.9 ? 'var(--color-long)' : pcr < 1.1 ? 'var(--color-warning)' : 'var(--color-short)';

  return (
    <div className="options-market-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">{selectedToken} Options Analytics</h2>
          <p className="view-subtitle text-secondary">
            Examines option open interest, call/put distributions, and max pain strike indexes representing capital hedging.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-cols-4 statistics-cards">
        <div className="card">
          <div className="card-title">
            <Layers size={16} />
            <span>Options Open Interest</span>
          </div>
          <div className="card-value font-mono text-purple">
            ${(optionsData.openInterest / 1e9).toFixed(2)}B
          </div>
          <p className="mini-desc text-secondary">Aggregate contracts outstanding</p>
        </div>

        <div className="card">
          <div className="card-title">
            <Activity size={16} />
            <span>24h Options Volume</span>
          </div>
          <div className="card-value font-mono text-cyan">
            ${(optionsData.volume24h / 1e6).toFixed(1)}M
          </div>
          <p className="mini-desc text-secondary">Total contract volume traded</p>
        </div>

        <div className="card">
          <div className="card-title">
            <TrendingUp size={16} style={{ color: sentimentColor }} />
            <span>Put/Call Ratio</span>
          </div>
          <div className="card-value font-mono" style={{ color: sentimentColor }}>
            {optionsData.putCallRatio}
          </div>
          <p className="mini-desc font-bold" style={{ color: sentimentColor }}>{sentiment.toUpperCase()}</p>
        </div>

        <div className="card">
          <div className="card-title">
            <Award size={16} className="text-purple" />
            <span>Options Max Pain Price</span>
          </div>
          <div className="card-value font-mono text-purple">
            ${optionsData.maxPainPrice.toLocaleString()}
          </div>
          <p className="mini-desc text-secondary">Expiry gravity price target</p>
        </div>
      </div>

      {/* Options Chain Grid Layout */}
      <div className="grid-dashboard options-layout">
        {/* Strike Distribution Table */}
        <div className="card chain-card">
          <div className="card-header-chain">
            <Layers className="trend-icon" size={18} />
            <h3>Deribit-Style Options Chain</h3>
          </div>
          <div className="table-container">
            <table className="custom-table options-chain-table">
              <thead>
                <tr>
                  <th className="align-left">Calls Open Interest</th>
                  <th className="align-center">Strike Price</th>
                  <th className="align-right">Puts Open Interest</th>
                </tr>
              </thead>
              <tbody>
                {optionsData.strikes.map((row) => {
                  const isMaxPain = row.strikePrice === optionsData.maxPainPrice;
                  return (
                    <tr key={row.strikePrice} className={isMaxPain ? 'max-pain-row' : ''}>
                      <td className="align-left font-mono text-cyan-glow">
                        ${(row.callsOI / 1e3).toLocaleString(undefined, { maximumFractionDigits: 0 })}K
                      </td>
                      <td className="align-center font-mono font-bold strike-cell">
                        ${row.strikePrice.toLocaleString()}
                        {isMaxPain && <span className="max-pain-badge font-mono">MAX PAIN</span>}
                      </td>
                      <td className="align-right font-mono text-pink-glow">
                        ${(row.putsOI / 1e3).toLocaleString(undefined, { maximumFractionDigits: 0 })}K
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Option Sentiment and Info explainer */}
        <div className="card sentiment-explainer-card">
          <div className="card-header-chain">
            <ShieldAlert size={18} className="text-purple" />
            <h3>Market Gravity Analysis</h3>
          </div>
          
          <div className="sentiment-meter-wrap">
            <span className="meter-label">Put/Call Ratio Sentiment Meter</span>
            <div className="meter-bar-wrapper">
              <div 
                className="meter-bar-fill" 
                style={{ 
                  width: `${Math.min(100, (optionsData.putCallRatio / 1.5) * 100)}%`,
                  backgroundColor: sentimentColor 
                }} 
              />
              <div className="meter-mark bullish-mark">Bullish</div>
              <div className="meter-mark neutral-mark">Neutral</div>
              <div className="meter-mark bearish-mark">Bearish</div>
            </div>
          </div>

          <div className="options-guide-box">
            <strong>What is Max Pain?</strong>
            <p className="text-secondary">
              The Max Pain Price is the strike price at which the largest number of open options contracts (calls and puts) would expire worthless. Options writers/market makers have an incentive to push the spot price toward this level as expiration approaches to minimize their payouts.
            </p>
            
            <strong>Put/Call Ratio Interpretation:</strong>
            <p className="text-secondary">
              A PCR ratio below **0.7** indicates strong bullish sentiment, meaning traders are buying significantly more call options than put options. A ratio above **1.0** indicates bearish sentiment, as put buying increases to hedge against price drops.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .options-market-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .mini-desc {
          font-size: 0.7rem;
          margin-top: 4px;
        }
        .font-bold {
          font-weight: 700;
        }
        .card-header-chain {
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .card-header-chain h3 {
          font-size: 1.1rem;
        }
        .trend-icon {
          color: var(--color-accent);
        }

        /* Options chain table */
        .options-chain-table th {
          font-size: 0.75rem;
          text-transform: uppercase;
        }
        .align-center {
          text-align: center;
        }
        .strike-cell {
          position: relative;
          color: var(--text-primary);
        }
        .text-cyan-glow {
          color: var(--color-info) !important;
        }
        .text-pink-glow {
          color: var(--color-short) !important;
        }
        .max-pain-row td {
          background-color: rgba(168, 85, 247, 0.04);
          border-left: 2px solid var(--color-accent);
        }
        .max-pain-badge {
          display: inline-block;
          font-size: 0.55rem;
          font-weight: 700;
          background: var(--color-accent);
          color: white;
          padding: 1px 4px;
          border-radius: 3px;
          margin-left: 8px;
          vertical-align: middle;
        }

        /* Sentiment Explainer */
        .sentiment-meter-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          padding: 14px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .meter-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .meter-bar-wrapper {
          height: 10px;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          position: relative;
          margin-bottom: 14px;
        }
        .meter-bar-fill {
          height: 100%;
          border-radius: 5px;
          transition: width 0.3s ease;
        }
        .meter-mark {
          position: absolute;
          top: 14px;
          font-size: 0.6rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .bullish-mark {
          left: 10%;
        }
        .neutral-mark {
          left: 48%;
          transform: translateX(-50%);
        }
        .bearish-mark {
          right: 10%;
        }

        .options-guide-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          padding: 14px;
          font-size: 0.75rem;
          border-left: 3px solid var(--color-accent);
        }
        .options-guide-box strong {
          color: var(--text-primary);
        }
        .options-guide-box p {
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
};
