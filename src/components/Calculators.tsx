/* eslint-disable */
import React, { useState, useEffect } from 'react';
import type { TokenStats } from '../services/apiService';
import { Calculator, AlertTriangle, RefreshCw, Activity } from 'lucide-react';

interface CalculatorsProps {
  selectedToken: string;
  tokenStats: TokenStats | undefined;
}

export const Calculators: React.FC<CalculatorsProps> = ({
  selectedToken,
  tokenStats,
}) => {
  // Liquidation Price Calculator States
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [leverage, setLeverage] = useState<number>(20);
  const [margin, setMargin] = useState<number>(1000);
  const [liqPrice, setLiqPrice] = useState<number>(0);
  const [safetyPercent, setSafetyPercent] = useState<number>(0);

  // PnL Calculator States
  const [pnlSide, setPnlSide] = useState<'long' | 'short'>('long');
  const [pnlEntry, setPnlEntry] = useState<number>(0);
  const [pnlExit, setPnlExit] = useState<number>(0);
  const [pnlLeverage, setPnlLeverage] = useState<number>(10);
  const [pnlMargin, setPnlMargin] = useState<number>(500);
  const [roe, setRoe] = useState<number>(0);
  const [profitVal, setProfitVal] = useState<number>(0);
  const [lastToken, setLastToken] = useState<string>('');

  // Synchronize initial entry price with selected token mark price
  useEffect(() => {
    if (tokenStats && selectedToken !== lastToken) {
      setEntryPrice(tokenStats.price);
      setPnlEntry(tokenStats.price);
      setPnlExit(tokenStats.price * (pnlSide === 'long' ? 1.05 : 0.95));
      setLastToken(selectedToken);
    }
  }, [selectedToken, tokenStats, lastToken, pnlSide]);

  // Calculate isolated liquidation price
  // Formual:
  // Long Liq = Entry * (1 - 1/Leverage + MM)
  // Short Liq = Entry * (1 + 1/Leverage - MM)
  // Assume Maintenance Margin (MM) = 0.5% (0.005)
  useEffect(() => {
    if (entryPrice <= 0 || leverage <= 0) return;
    const mm = 0.005; // 0.5% maintenance margin
    let calculatedLiq = 0;

    if (side === 'long') {
      calculatedLiq = entryPrice * (1 - 1 / leverage + mm);
      calculatedLiq = Math.max(0, calculatedLiq);
    } else {
      calculatedLiq = entryPrice * (1 + 1 / leverage - mm);
    }

    setLiqPrice(calculatedLiq);

    // Calculate distance to liquidation in percent
    const diff = Math.abs(calculatedLiq - entryPrice);
    const pct = (diff / entryPrice) * 100;
    setSafetyPercent(pct);
  }, [side, entryPrice, leverage]);

  // Calculate PnL / ROE
  useEffect(() => {
    if (pnlEntry <= 0 || pnlExit <= 0 || pnlLeverage <= 0 || pnlMargin <= 0) return;

    let priceChangePct = (pnlExit - pnlEntry) / pnlEntry;
    if (pnlSide === 'short') {
      priceChangePct = -priceChangePct;
    }

    const calculatedRoe = priceChangePct * pnlLeverage * 100;
    const calculatedProfit = pnlMargin * (calculatedRoe / 100);

    setRoe(calculatedRoe);
    setProfitVal(calculatedProfit);
  }, [pnlSide, pnlEntry, pnlExit, pnlLeverage, pnlMargin]);

  const handleResetLiq = () => {
    if (tokenStats) {
      setEntryPrice(tokenStats.price);
      setLeverage(20);
      setMargin(1000);
      setSide('long');
    }
  };

  const handleResetPnl = () => {
    if (tokenStats) {
      setPnlEntry(tokenStats.price);
      setPnlExit(tokenStats.price * 1.05);
      setPnlLeverage(10);
      setPnlMargin(500);
      setPnlSide('long');
    }
  };

  return (
    <div className="calculators-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">Derivative Margin & Risk Calculators</h2>
          <p className="view-subtitle text-secondary">
            Simulate perpetual contracts risk thresholds and return parameters before executing order entries.
          </p>
        </div>
      </div>

      <div className="grid-cols-2 calculators-layout">
        {/* Calculator 1: Liquidation Price */}
        <div className="card calculator-card">
          <div className="calc-header-bar">
            <div className="title-section">
              <AlertTriangle className="trend-warning" size={18} />
              <h3>Isolated Liquidation Price</h3>
            </div>
            <button onClick={handleResetLiq} className="reset-btn" title="Reset Calculator">
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="calc-body">
            {/* Position Side Toggles */}
            <div className="toggle-group">
              <button
                onClick={() => setSide('long')}
                className={`toggle-tab long-tab ${side === 'long' ? 'active' : ''}`}
              >
                LONG
              </button>
              <button
                onClick={() => setSide('short')}
                className={`toggle-tab short-tab ${side === 'short' ? 'active' : ''}`}
              >
                SHORT
              </button>
            </div>

            {/* Entry Price Input */}
            <div className="input-group">
              <label>Entry Price (USD)</label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="input-field font-mono"
              />
            </div>

            {/* Leverage Input & Slider */}
            <div className="input-group">
              <div className="input-label-row">
                <label>Leverage</label>
                <span className="slider-val font-mono">{leverage}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="125"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value) || 1)}
                className="slider-input"
              />
              <div className="leverage-ticks font-mono">
                <span>1x</span>
                <span>25x</span>
                <span>50x</span>
                <span>75x</span>
                <span>100x</span>
                <span>125x</span>
              </div>
            </div>

            {/* Margin Input */}
            <div className="input-group">
              <label>Margin Capital (USD)</label>
              <input
                type="number"
                value={margin}
                onChange={(e) => setMargin(parseFloat(e.target.value) || 0)}
                className="input-field font-mono"
              />
            </div>

            {/* Outputs display */}
            <div className="calc-outputs">
              <div className="output-row primary-output">
                <span className="label">Estimated Liquidation Price</span>
                <span className="value font-mono trend-down">
                  ${liqPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="output-row">
                <span className="label">Risk Distance</span>
                <span className={`value font-mono ${safetyPercent < 5 ? 'trend-down font-bold' : safetyPercent < 15 ? 'trend-warning' : 'trend-up'}`}>
                  {safetyPercent.toFixed(2)}%
                </span>
              </div>

              <div className="output-row">
                <span className="label">Notional Position Value</span>
                <span className="value font-mono">
                  ${(margin * leverage).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Risk Warnings */}
            {safetyPercent < 5 && (
              <div className="danger-alert glow-short font-mono">
                <AlertTriangle size={16} />
                <span>WARNING: High leverage. A {safetyPercent.toFixed(1)}% price move will liquidate position.</span>
              </div>
            )}
          </div>
        </div>

        {/* Calculator 2: PnL & Return on Equity */}
        <div className="card calculator-card">
          <div className="calc-header-bar">
            <div className="title-section">
              <Calculator className="trend-info" size={18} />
              <h3>PnL & Return on Equity (ROE)</h3>
            </div>
            <button onClick={handleResetPnl} className="reset-btn" title="Reset Calculator">
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="calc-body">
            {/* Position Side Toggles */}
            <div className="toggle-group">
              <button
                onClick={() => setPnlSide('long')}
                className={`toggle-tab long-tab ${pnlSide === 'long' ? 'active' : ''}`}
              >
                LONG
              </button>
              <button
                onClick={() => setPnlSide('short')}
                className={`toggle-tab short-tab ${pnlSide === 'short' ? 'active' : ''}`}
              >
                SHORT
              </button>
            </div>

            {/* PnL Inputs */}
            <div className="input-group-row">
              <div className="input-group">
                <label>Entry Price (USD)</label>
                <input
                  type="number"
                  value={pnlEntry}
                  onChange={(e) => setPnlEntry(parseFloat(e.target.value) || 0)}
                  className="input-field font-mono"
                />
              </div>
              <div className="input-group">
                <label>Exit Price (USD)</label>
                <input
                  type="number"
                  value={pnlExit}
                  onChange={(e) => setPnlExit(parseFloat(e.target.value) || 0)}
                  className="input-field font-mono"
                />
              </div>
            </div>

            {/* PnL Leverage */}
            <div className="input-group">
              <div className="input-label-row">
                <label>Leverage</label>
                <span className="slider-val font-mono">{pnlLeverage}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="125"
                value={pnlLeverage}
                onChange={(e) => setPnlLeverage(parseInt(e.target.value) || 1)}
                className="slider-input"
              />
            </div>

            {/* PnL Margin */}
            <div className="input-group">
              <label>Margin Capital (USD)</label>
              <input
                type="number"
                value={pnlMargin}
                onChange={(e) => setPnlMargin(parseFloat(e.target.value) || 0)}
                className="input-field font-mono"
              />
            </div>

            {/* PnL Outputs */}
            <div className="calc-outputs">
              <div className="output-row primary-output">
                <span className="label">Estimated Net Profit</span>
                <span className={`value font-mono ${profitVal >= 0 ? 'trend-up' : 'trend-down'}`}>
                  {profitVal >= 0 ? '+' : ''}${profitVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="output-row">
                <span className="label">Return on Equity (ROE)</span>
                <span className={`value font-mono ${roe >= 0 ? 'trend-up font-bold' : 'trend-down font-bold'}`}>
                  {roe >= 0 ? '+' : ''}{roe.toFixed(2)}%
                </span>
              </div>

              <div className="output-row">
                <span className="label">Account Value after Trade</span>
                <span className="value font-mono">
                  ${Math.max(0, pnlMargin + profitVal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Margin Guide */}
      <div className="card mm-guide-card">
        <div className="explanation-header">
          <Activity size={18} className="text-cyan" />
          <h4>Isolated Perpetual Margin Calculations</h4>
        </div>
        <p className="text-secondary font-size-sm">
          Perpetual contract calculations utilize a Maintenance Margin (MM) parameter (estimated at <strong>0.5%</strong> in these panels). When your margin balance drops below the maintenance margin value of the position size, the contract broker triggers automated liquidations. High leverage increases liquidation risk by narrowing the safety margin window.
        </p>
      </div>

      <style>{`
        .calculators-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .calc-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .calc-header-bar h3 {
          font-size: 1.1rem;
        }
        .reset-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: color var(--transition-fast);
          padding: 4px;
        }
        .reset-btn:hover {
          color: var(--text-primary);
        }
        
        .calc-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        /* Toggles */
        .toggle-group {
          display: flex;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.15);
        }
        .toggle-tab {
          flex: 1;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          padding: 10px;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .long-tab:hover {
          color: var(--color-long);
        }
        .short-tab:hover {
          color: var(--color-short);
        }
        .long-tab.active {
          background: var(--color-long-glow);
          color: var(--color-long);
          border-bottom: 2px solid var(--color-long);
        }
        .short-tab.active {
          background: var(--color-short-glow);
          color: var(--color-short);
          border-bottom: 2px solid var(--color-short);
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .input-group label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .input-group-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .input-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .slider-val {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-accent);
        }
        
        /* Custom sliders */
        .slider-input {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.08);
          outline: none;
        }
        .slider-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--color-accent);
          cursor: pointer;
          box-shadow: 0 0 8px rgba(168, 85, 247, 0.5);
          transition: transform 0.1s;
        }
        .slider-input::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .leverage-ticks {
          display: flex;
          justify-content: space-between;
          font-size: 0.6rem;
          color: var(--text-muted);
          padding-top: 2px;
        }
        
        /* Outputs box */
        .calc-outputs {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .output-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
        }
        .output-row .label {
          color: var(--text-secondary);
        }
        .output-row .value {
          font-weight: 600;
        }
        .primary-output {
          border-bottom: 1px dashed var(--border-color);
          padding-bottom: 10px;
          margin-bottom: 4px;
        }
        .primary-output .label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .primary-output .value {
          font-size: 1.3rem;
          font-weight: 700;
        }
        
        .danger-alert {
          background: rgba(244, 63, 94, 0.08);
          border: 1px solid rgba(244, 63, 94, 0.2);
          color: var(--color-short);
          padding: 10px;
          border-radius: 6px;
          font-size: 0.7rem;
          display: flex;
          align-items: center;
          gap: 8px;
          line-height: 1.3;
        }
        .mm-guide-card {
          margin-top: 4px;
        }
        .font-size-sm {
          font-size: 0.75rem;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
};
