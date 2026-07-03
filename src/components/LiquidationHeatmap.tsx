/* eslint-disable */
import React, { useState } from 'react';
import { getLiquidationHeatmap } from '../services/apiService';
import type { TokenStats, LiquidationEvent } from '../services/apiService';
import { Flame, HelpCircle, Layers, Zap } from 'lucide-react';

interface LiquidationHeatmapProps {
  selectedToken: string;
  tokenStats: TokenStats | undefined;
  isLightTheme: boolean;
  liquidations: LiquidationEvent[];
}

export const LiquidationHeatmap: React.FC<LiquidationHeatmapProps> = ({
  selectedToken,
  tokenStats,
  isLightTheme,
  liquidations,
}) => {
  const [selectedRange, setSelectedRange] = useState<'24h' | '3d' | '7d'>('24h');
  const [hoveredPool, setHoveredPool] = useState<any>(null);
  const [visibleLeverage, setVisibleLeverage] = useState<number[]>([10, 25, 50, 100]);
  const [depthRange, setDepthRange] = useState<0.05 | 0.10 | 0.25>(0.10);
  const [simulatedPrice, setSimulatedPrice] = useState<number>(0);

  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastLoadedToken, setLastLoadedToken] = useState<string>('');

  // Position Sizer States
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPct, setRiskPct] = useState<number>(1.0);

  // Live Liquidation Pings
  const [liveLiquidationPings, setLiveLiquidationPings] = useState<any[]>([]);

  React.useEffect(() => {
    if (tokenStats?.price && selectedToken !== lastLoadedToken) {
      setSimulatedPrice(tokenStats.price);
      setLastLoadedToken(selectedToken);
    }
  }, [selectedToken, tokenStats?.price, lastLoadedToken]);

  React.useEffect(() => {
    if (!tokenStats) return;

    const loadHeatmap = async () => {
      setLoading(true);
      try {
        const data = await getLiquidationHeatmap(selectedToken, tokenStats.price);
        setHeatmapData(data);
      } catch (error) {
        console.error('Failed to load heatmap:', error);
      } finally {
        setLoading(false);
      }
    };
    loadHeatmap();
  }, [selectedToken, selectedRange, !!tokenStats]);

  // Listen to live WebSocket liquidation feed from props
  React.useEffect(() => {
    if (liquidations.length === 0) return;
    const latest = liquidations[0];
    if (latest.symbol === selectedToken) {
      const pingId = latest.id;
      setLiveLiquidationPings(prev => {
        if (prev.some(p => p.id === pingId)) return prev;
        return [{
          id: pingId,
          price: latest.price,
          amountUsd: latest.amountUsd,
          side: latest.side,
          timestamp: Date.now()
        }, ...prev].slice(0, 10);
      });
    }
  }, [liquidations, selectedToken]);

  // Cleanup old pings (fade out after 4 seconds)
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setLiveLiquidationPings(prev => 
        prev.filter(ping => now - ping.timestamp < 4000)
      );
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (!tokenStats) return <div className="loading">Loading heatmap...</div>;

  const currentPrice = tokenStats.price;
  
  const simulatedPricePctDiff = (simulatedPrice - currentPrice) / currentPrice;
  const simulatedX = Math.max(50, Math.min(950, 500 + (simulatedPricePctDiff / depthRange) * 450));
  
  // Categorize into Long (liquidated below price) and Short (liquidated above price)
  const longPools = heatmapData.filter(d => d.price < currentPrice);
  const shortPools = heatmapData.filter(d => d.price > currentPrice);

  // Maximum volume for scaling bubble sizes/opacities (filtering on visible leverage)
  const filteredPools = heatmapData.filter(d => visibleLeverage.includes(d.leverage));
  const maxVolume = Math.max(...filteredPools.map(d => d.volume), 1);

  // Stats calculation
  const totalShortPoolsUsd = shortPools.reduce((sum, p) => sum + p.volume, 0);
  const totalLongPoolsUsd = longPools.reduce((sum, p) => sum + p.volume, 0);

  const cascadeMetrics = React.useMemo(() => {
    let longsFlushed = 0;
    let shortsFlushed = 0;
    
    heatmapData.forEach(pool => {
      if (pool.price < currentPrice && pool.price >= simulatedPrice && simulatedPrice < currentPrice) {
        longsFlushed += pool.volume;
      } else if (pool.price > currentPrice && pool.price <= simulatedPrice && simulatedPrice > currentPrice) {
        shortsFlushed += pool.volume;
      }
    });

    return {
      longsFlushed,
      shortsFlushed,
      totalFlushed: longsFlushed + shortsFlushed
    };
  }, [heatmapData, currentPrice, simulatedPrice]);

  const smartSignals = React.useMemo(() => {
    if (heatmapData.length === 0) return null;

    const activePools = heatmapData.filter(d => d.volume > 0);
    if (activePools.length === 0) return null;

    const analyzedPools = activePools.map(pool => {
      const isLong = pool.price < currentPrice;
      const distancePct = Math.abs(pool.price - currentPrice) / currentPrice;
      
      const proximityWeight = 1 - Math.min(1, distancePct / depthRange);
      const gravityWeight = (pool.volume / maxVolume) * 0.4 + proximityWeight * 0.6;
      const gravityScore = Math.max(5, Math.min(100, Math.round(gravityWeight * 100)));

      return {
        ...pool,
        isLong,
        distancePct: distancePct * 100,
        gravityScore
      };
    });

    const sortedByGravity = [...analyzedPools].sort((a, b) => b.gravityScore - a.gravityScore);
    const primaryMagnet = sortedByGravity[0];

    const supportPools = analyzedPools
      .filter(p => p.isLong)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 3);

    const resistancePools = analyzedPools
      .filter(p => !p.isLong)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 3);

    return {
      primaryMagnet,
      supportPools,
      resistancePools
    };
  }, [heatmapData, currentPrice, depthRange, maxVolume]);

  const tradeRecommendation = React.useMemo(() => {
    if (!smartSignals || !smartSignals.primaryMagnet) return null;
    
    const magnet = smartSignals.primaryMagnet;
    const isSqueeze = !magnet.isLong; // magnet is above current price (shorts squeeze)
    
    let direction: 'LONG' | 'SHORT' = 'LONG';
    let entryPriceRec = currentPrice;
    let takeProfitRec = magnet.price;
    let stopLossRec = currentPrice;
    let setupName = '';
    let strategyDesc = '';
    
    if (isSqueeze) {
      direction = 'LONG';
      setupName = 'Short Squeeze Breakout';
      entryPriceRec = currentPrice;
      takeProfitRec = magnet.price;
      const primarySupport = smartSignals.supportPools[0]?.price || currentPrice * 0.99;
      stopLossRec = primarySupport * 0.996;
      strategyDesc = `Buy the breakout momentum. High concentration of short liquidations above acts as a strong upward price magnet. Target the squeeze cluster.`;
    } else {
      direction = 'LONG';
      setupName = 'Support Sweep Reversal';
      entryPriceRec = magnet.price;
      takeProfitRec = Math.max(currentPrice, smartSignals.resistancePools[0]?.price || currentPrice * 1.01);
      stopLossRec = magnet.price * 0.992;
      strategyDesc = `Set Buy Limit Orders at the heavy support pool level to catch downside wicks. A sweep of this pool will trigger quick long liquidations followed by immediate buying pressure and price rebound.`;
    }
    
    const distanceToTP = Math.abs(takeProfitRec - entryPriceRec) / entryPriceRec;
    const distanceToSL = Math.max(0.001, Math.abs(entryPriceRec - stopLossRec) / entryPriceRec);
    const rrRatio = parseFloat((distanceToTP / distanceToSL).toFixed(2));

    return {
      setupName,
      direction,
      entryPrice: entryPriceRec,
      takeProfit: takeProfitRec,
      stopLoss: stopLossRec,
      strategyDesc,
      rrRatio,
      distanceToSLPct: distanceToSL * 100
    };
  }, [smartSignals, currentPrice]);

  return (
    <div className="heatmap-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">Liquidation Heatmap (Order Book Pools)</h2>
          <p className="view-subtitle text-secondary">
            Visualizes heavy clusters of leverage liquidations. Glowing pools act as "magnetic" support/resistance lines.
          </p>
        </div>
        <div className="heatmap-selectors">
          <div className="selector-group">
            <span className="selector-label">Zoom Depth:</span>
            {([0.05, 0.10, 0.25] as const).map((depth) => (
              <button
                key={depth}
                onClick={() => setDepthRange(depth)}
                className={`range-btn ${depthRange === depth ? 'active' : ''}`}
              >
                {depth * 100}%
              </button>
            ))}
          </div>
          <div className="selector-group">
            <span className="selector-label">Timeframe:</span>
            <div className="timeframe-selector">
              {(['24h', '3d', '7d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedRange(range)}
                  className={`range-btn ${selectedRange === range ? 'active' : ''}`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Insights Summary */}
      <div className="grid-cols-4 heatmap-stats">
        <div className="card stat-mini long-stats">
          <span className="label">Total Long Liquidation Pools</span>
          <span className="value trend-up">${(totalLongPoolsUsd / 1e6).toFixed(2)}M</span>
          <span className="desc">Price levels below current mark</span>
        </div>
        <div className="card stat-mini short-stats">
          <span className="label">Total Short Liquidation Pools</span>
          <span className="value trend-down">${(totalShortPoolsUsd / 1e6).toFixed(2)}M</span>
          <span className="desc">Price levels above current mark</span>
        </div>
        <div className="card stat-mini magnet-stats">
          <span className="label">Primary Magnet Zone</span>
          <span className="value text-purple font-mono">
            {smartSignals?.primaryMagnet 
              ? `$${smartSignals.primaryMagnet.price.toLocaleString(undefined, { maximumFractionDigits: 1 })}`
              : 'N/A'
            }
          </span>
          <span className="desc">
            {smartSignals?.primaryMagnet 
              ? `${smartSignals.primaryMagnet.leverage}x ${smartSignals.primaryMagnet.isLong ? 'Long' : 'Short'} Pool (${smartSignals.primaryMagnet.gravityScore}% Pull)`
              : 'Calculating magnet...'
            }
          </span>
        </div>
        <div className="card stat-mini buffer-stats">
          <span className="label">Market Sentiment Bias</span>
          <span className="value text-cyan">
            {totalLongPoolsUsd > totalShortPoolsUsd ? 'Long Heavy' : 'Short Heavy'}
          </span>
          <span className="desc">Long vs Short leverage pool skew</span>
        </div>
      </div>

      {/* SVG Interactive Chart */}
      {/* Heatmap Layout with Bubble Chart and Cumulative Profile */}
      <div className="grid-dashboard heatmap-layout">
        {/* Heatmap SVG Chart Card */}
        <div className="card heatmap-chart-card">
          <div className="chart-header">
            <div className="title-section">
              <Flame className="flame-orange" size={20} />
              <h3>Liquidation Price Clusters vs Leverage</h3>
            </div>
            
            {/* Leverage Filter Badges */}
            <div className="leverage-filter-badges">
              <span className="filter-title">Filters:</span>
              {[100, 50, 25, 10].map((lev) => {
                const isActive = visibleLeverage.includes(lev);
                return (
                  <button
                    key={lev}
                    onClick={() => {
                      setVisibleLeverage(prev => 
                        prev.includes(lev) ? prev.filter(l => l !== lev) : [...prev, lev]
                      );
                    }}
                    className={`lev-filter-badge ${isActive ? 'active' : ''}`}
                  >
                    {lev}x
                  </button>
                );
              })}
            </div>

            <div className="legend-section">
              <span className="legend-item"><span className="dot long-dot"></span> Longs</span>
              <span className="legend-item"><span className="dot short-dot"></span> Shorts</span>
              <span className="legend-item"><span className="current-line-dot"></span> Mark Price</span>
            </div>
          </div>

        <div className="svg-wrapper" style={{ position: 'relative' }}>
          {loading && heatmapData.length === 0 && (
            <div className="loading-overlay" style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: isLightTheme ? 'rgba(248, 250, 252, 0.75)' : 'rgba(6, 7, 10, 0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', fontSize: '0.875rem',
              zIndex: 5, borderRadius: '6px'
            }}>
              Syncing live heatmap pools...
            </div>
          )}
          <svg className="heatmap-svg" viewBox="0 0 1000 400" width="100%" height="100%">
            <defs>
              <linearGradient id="longGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-long)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--color-long)" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="shortGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-short)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--color-short)" stopOpacity="0.0" />
              </linearGradient>
              <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Grid Lines */}
            {Array.from({ length: 9 }).map((_, i) => {
              const x = 50 + i * 112.5; // symmetrical steps
              const step = depthRange / 4;
              return (
                <g key={`grid-y-${i}`}>
                  <line x1={x} y1="30" x2={x} y2="340" stroke={isLightTheme ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.03)"} strokeWidth="1" />
                  {/* Price ticks below */}
                  {i > 0 && i < 8 && (
                    <text
                      x={x}
                      y="365"
                      fill="var(--text-secondary)"
                      fontSize="10"
                      textAnchor="middle"
                      className="font-mono"
                    >
                      ${(currentPrice * (1 + (i - 4) * step)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </text>
                  )}
                </g>
              );
            })}

            {Array.from({ length: 6 }).map((_, i) => {
              const y = 50 + i * 55;
              const leverageLabel = [100, 50, 25, 10, 5, 2][i];
              return (
                <g key={`grid-x-${i}`}>
                  <line x1="50" y1={y} x2="950" y2={y} stroke={isLightTheme ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.03)"} strokeWidth="1" />
                  <text
                    x="25"
                    y={y + 4}
                    fill="var(--text-secondary)"
                    fontSize="10"
                    textAnchor="middle"
                    className="font-mono"
                  >
                    {leverageLabel}x
                  </text>
                </g>
              );
            })}

            {/* Y Axis Label */}
            <text x="20" y="20" fill="var(--text-secondary)" fontSize="9" fontWeight="600">LEVERAGE</text>
            <text x="965" y="365" fill="var(--text-secondary)" fontSize="9" fontWeight="600">PRICE</text>

            {/* Current Price Reference Line */}
            <line
              x1="500"
              y1="30"
              x2="500"
              y2="340"
              stroke="var(--color-accent)"
              strokeDasharray="4 3"
              strokeWidth="1.5"
            />
            <rect x="450" y="10" width="100" height="20" rx="4" fill={isLightTheme ? "rgba(168, 85, 247, 0.08)" : "rgba(168, 85, 247, 0.2)"} stroke="var(--color-accent)" strokeWidth="1" />
            <text x="500" y="23" fill="var(--text-primary)" fontSize="10" fontWeight="600" textAnchor="middle" className="font-mono">
              MARK: ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </text>

            {/* Render Simulated Price Wick Zone and Line if simulatedPrice !== currentPrice */}
            {simulatedPrice !== currentPrice && (
              <g key="simulated-wick-group">
                {/* Highlight Sweep Zone */}
                {simulatedPrice < currentPrice ? (
                  <rect
                    x={simulatedX}
                    y="30"
                    width={500 - simulatedX}
                    height="310"
                    fill="var(--color-long)"
                    fillOpacity="0.08"
                  />
                ) : (
                  <rect
                    x="500"
                    y="30"
                    width={simulatedX - 500}
                    height="310"
                    fill="var(--color-short)"
                    fillOpacity="0.08"
                  />
                )}
                
                {/* Vertical Wick Line */}
                <line
                  x1={simulatedX}
                  y1="30"
                  x2={simulatedX}
                  y2="340"
                  stroke="var(--color-warning)"
                  strokeDasharray="4 2"
                  strokeWidth="1.5"
                />
                
                {/* Wick Tag */}
                <g transform={`translate(${simulatedX}, 345)`}>
                  <rect
                    x="-45"
                    y="0"
                    width="90"
                    height="16"
                    rx="3"
                    fill={isLightTheme ? "#ffffff" : "rgba(245, 158, 11, 0.15)"}
                    stroke="var(--color-warning)"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="11"
                    fill="var(--color-warning)"
                    fontSize="8"
                    fontWeight="700"
                    textAnchor="middle"
                    className="font-mono"
                  >
                    WICK: ${simulatedPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </text>
                </g>
              </g>
            )}

            {/* Render Smart Support/Resistance Pool Lines on Chart */}
            {smartSignals && [...smartSignals.supportPools, ...smartSignals.resistancePools].map((pool, idx) => {
              const pricePctDiff = (pool.price - currentPrice) / currentPrice;
              const x = 500 + (pricePctDiff / depthRange) * 450;
              if (x < 50 || x > 950) return null;

              const isSupport = pool.price < currentPrice;
              const color = isSupport ? 'var(--color-long)' : 'var(--color-short)';
              const dashArray = '2 2';
              
              return (
                <g key={`liq-line-${idx}`}>
                  <line
                    x1={x}
                    y1="30"
                    x2={x}
                    y2="340"
                    stroke={color}
                    strokeDasharray={dashArray}
                    strokeWidth="1.2"
                    strokeOpacity="0.4"
                  />
                  <rect
                    x={x - 22}
                    y={isSupport ? 315 + (idx % 2) * 12 : 35 + (idx % 2) * 12}
                    width="44"
                    height="12"
                    rx="2"
                    fill={isSupport ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)'}
                    stroke={color}
                    strokeWidth="0.5"
                    strokeOpacity="0.5"
                  />
                  <text
                    x={x}
                    y={isSupport ? 324 + (idx % 2) * 12 : 44 + (idx % 2) * 12}
                    fill={color}
                    fontSize="7"
                    fontWeight="700"
                    textAnchor="middle"
                    className="font-mono"
                  >
                    ${(pool.price / 1000).toFixed(1)}k
                  </text>
                </g>
              );
            })}

            {/* Render Liquidation Pool Clusters (Bubbles) */}
            {heatmapData.map((pool, idx) => {
              if (!visibleLeverage.includes(pool.leverage)) return null;

              const isLong = pool.price < currentPrice;
              const pricePctDiff = (pool.price - currentPrice) / currentPrice;
              const x = 500 + (pricePctDiff / depthRange) * 450; 
              
              let y = 300;
              if (pool.leverage === 100) y = 50;
              else if (pool.leverage === 50) y = 105;
              else if (pool.leverage === 25) y = 160;
              else if (pool.leverage === 10) y = 215;

              const volumeRatio = pool.volume / maxVolume;
              const r = 6 + volumeRatio * 18;

              const color = isLong ? 'var(--color-long)' : 'var(--color-short)';
              const opacity = 0.45 + volumeRatio * 0.55;

              if (x < 50 || x > 950) return null;

              const isHit = isLong 
                ? (pool.price >= simulatedPrice && simulatedPrice < currentPrice)
                : (pool.price <= simulatedPrice && simulatedPrice > currentPrice);

              const fillOpacityVal = isHit ? 0.08 : opacity;
              const strokeColor = isHit ? 'var(--color-warning)' : color;
              const strokeWidthVal = isHit ? 1.5 : 1;
              const strokeDashVal = isHit ? '2 2' : undefined;

              return (
                <circle
                  key={`pool-${idx}`}
                  cx={x}
                  cy={y}
                  r={r}
                  fill={color}
                  fillOpacity={fillOpacityVal}
                  stroke={strokeColor}
                  strokeWidth={strokeWidthVal}
                  strokeDasharray={strokeDashVal}
                  strokeOpacity="0.8"
                  filter={volumeRatio > 0.6 && !isHit ? "url(#glowEffect)" : ""}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={() => setHoveredPool({ ...pool, isLong, x, y })}
                  onMouseLeave={() => setHoveredPool(null)}
                  onClick={() => setSimulatedPrice(pool.price)}
                />
              );
            })}

            {/* Render Live WebSocket Liquidation Pings (Fading overlay) */}
            {liveLiquidationPings.map((ping) => {
              const pctDiff = (ping.price - currentPrice) / currentPrice;
              const x = 500 + (pctDiff / depthRange) * 450;
              if (x < 50 || x > 950) return null;

              const isPingLong = ping.side === 'long';
              const color = isPingLong ? 'var(--color-long)' : 'var(--color-short)';
              
              const age = Date.now() - ping.timestamp;
              const opacityVal = Math.max(0, 1 - age / 4000);
              
              return (
                <g key={ping.id} style={{ opacity: opacityVal, transition: 'opacity 0.2s' }}>
                  {/* Flashing Vertical Line */}
                  <line
                    x1={x}
                    y1="30"
                    x2={x}
                    y2="340"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    className="ping-flash-line"
                  />
                  {/* Glowing center indicator */}
                  <circle
                    cx={x}
                    cy={isPingLong ? 300 : 105}
                    r="12"
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    className="ping-flash-circle"
                  />
                  <circle
                    cx={x}
                    cy={isPingLong ? 300 : 105}
                    r="4"
                    fill="var(--color-warning)"
                  />
                  {/* Floating Liquidation Amount tag */}
                  <g transform={`translate(${x}, ${isPingLong ? 280 : 125})`}>
                    <rect
                      x="-35"
                      y="-12"
                      width="70"
                      height="15"
                      rx="2"
                      fill="var(--bg-card)"
                      stroke={color}
                      strokeWidth="0.8"
                    />
                    <text
                      x="0"
                      y="-1"
                      fill="var(--text-primary)"
                      fontSize="7"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="font-mono"
                    >
                      LIQ: ${(ping.amountUsd / 1000).toFixed(0)}k
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* SVG Tooltip */}
          {hoveredPool && (
            <div
              className="heatmap-tooltip card"
              style={{
                position: 'absolute',
                left: `${(hoveredPool.x / 1000) * 100}%`,
                top: `${(hoveredPool.y / 400) * 100 - 32}%`,
                transform: 'translate(-50%, -100%)',
                zIndex: 10,
                pointerEvents: 'none',
                padding: '10px 14px',
                borderLeft: `4px solid ${hoveredPool.isLong ? 'var(--color-long)' : 'var(--color-short)'}`,
                minWidth: '220px',
              }}
            >
              <div className="tooltip-title">
                <span className={`badge-indicator ${hoveredPool.isLong ? 'long' : 'short'}`}>
                  {hoveredPool.isLong ? 'LONG LIQUIDATION' : 'SHORT LIQUIDATION'}
                </span>
                <span className="leverage font-mono">{hoveredPool.leverage}x</span>
              </div>
              <div className="tooltip-row">
                <span className="label">Liq Price:</span>
                <span className="value font-mono">
                  ${hoveredPool.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
              </div>
              <div className="tooltip-row">
                <span className="label">Est. Volume:</span>
                <span className="value font-mono highlight">
                  ${hoveredPool.volume.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

          {/* Wick Cascade Simulator */}
          <div className="wick-simulator-panel">
            <div className="simulator-header">
              <div className="sim-title">
                <Zap size={14} className="text-yellow" style={{ color: 'var(--color-warning)' }} />
                <strong>Leverage Liquidation Cascade Simulator</strong>
              </div>
              <div className="sim-metrics font-mono">
                <span>Simulated Wick: <strong>${simulatedPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong></span>
                <span className="divider">|</span>
                <span className="text-yellow font-bold">Est. Margin Flushed: <strong>${(cascadeMetrics.totalFlushed / 1e6).toFixed(2)}M</strong></span>
              </div>
            </div>
            <div className="slider-wrapper">
              <input
                type="range"
                min={currentPrice * (1 - depthRange)}
                max={currentPrice * (1 + depthRange)}
                step={currentPrice * 0.0005}
                value={simulatedPrice}
                onChange={(e) => setSimulatedPrice(parseFloat(e.target.value))}
                className="slider-input sim-slider"
              />
              <div className="slider-labels font-mono text-secondary">
                <span>-{depthRange * 100}% Wick</span>
                <span className="current-price-label">Current Mark</span>
                <span>+{depthRange * 100}% Wick</span>
              </div>
            </div>
          </div>

          <div className="heatmap-guide">
            <HelpCircle size={16} />
            <span>
              <strong>How to read:</strong> Each bubble represents a cluster of traders' liquidation prices. When market price moves into these bubbles, those positions trigger automatically, creating high volatility. Bids (Green) support the price; Asks (Red) act as overhead resistance. Drag the simulator slider to estimate margin cascade volumes.
            </span>
          </div>
      </div>

      {/* Right Sidebar: Profile + Smart Signals */}
      <div className="heatmap-right-sidebar">
        {/* Cumulative Leverage Profile Card */}
        <div className="card cumulative-profile-card">
          <div className="card-header-profile">
            <Layers className="text-purple" size={18} />
            <h3>Cumulative Leverage Profile</h3>
          </div>
          <div className="profile-desc text-secondary">
            Cumulative USD value of liquidation support and resistance zones stacked by leverage bands.
          </div>
          <div className="profile-rows font-mono">
            {[100, 50, 25, 10].map((lev) => {
              const levPools = heatmapData.filter(d => d.leverage === lev);
              const longVol = levPools.filter(d => d.price < currentPrice).reduce((sum, d) => sum + d.volume, 0);
              const shortVol = levPools.filter(d => d.price > currentPrice).reduce((sum, d) => sum + d.volume, 0);
              const totalVol = longVol + shortVol;
              
              const allLevTotals = [100, 50, 25, 10].map(l => {
                const p = heatmapData.filter(d => d.leverage === l);
                return p.reduce((sum, d) => sum + d.volume, 0);
              });
              const maxVolVal = Math.max(1, ...allLevTotals);
              const widthPct = (totalVol / maxVolVal) * 100;

              return (
                <div key={lev} className="profile-row-item">
                  <div className="profile-row-meta">
                    <span className="lev-label font-bold">{lev}x Leverage</span>
                    <span className="vol-val font-bold">${(totalVol / 1e6).toFixed(2)}M</span>
                  </div>
                  <div className="profile-bar-track">
                    <div 
                      className="profile-bar-long" 
                      style={{ 
                        width: totalVol > 0 ? `${(longVol / totalVol) * widthPct}%` : '0%',
                        backgroundColor: 'var(--color-long)'
                      }} 
                    />
                    <div 
                      className="profile-bar-short" 
                      style={{ 
                        width: totalVol > 0 ? `${(shortVol / totalVol) * widthPct}%` : '0%',
                        backgroundColor: 'var(--color-short)'
                      }} 
                    />
                  </div>
                  <div className="profile-bar-legend text-secondary">
                    <span className="trend-up">L: ${(longVol / 1e6).toFixed(1)}M</span>
                    <span className="trend-down">S: ${(shortVol / 1e6).toFixed(1)}M</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Smart Trading Signals Card */}
        {smartSignals && (
          <div className="card smart-signals-card">
            <div className="card-header-profile">
              <Zap className="text-yellow" size={18} style={{ color: 'var(--color-warning)' }} />
              <h3>Smart Liquidity Intel</h3>
            </div>
            
            {/* Gravity Meter */}
            <div className="gravity-meter-wrap">
              <div className="gravity-meter-header">
                <span className="label">Liquidity Pull Gravity:</span>
                <span className="val font-mono font-bold" style={{ color: 'var(--color-warning)' }}>
                  {smartSignals.primaryMagnet.gravityScore}%
                </span>
              </div>
              <div className="gravity-progress-bar">
                <div 
                  className="gravity-progress-fill" 
                  style={{ 
                    width: `${smartSignals.primaryMagnet.gravityScore}%`,
                    backgroundColor: 'var(--color-warning)'
                  }} 
                />
              </div>
              <div className="gravity-direction text-secondary">
                Target Zone: <span className={smartSignals.primaryMagnet.isLong ? 'trend-up font-bold' : 'trend-down font-bold'}>
                  ${smartSignals.primaryMagnet.price.toLocaleString(undefined, { maximumFractionDigits: 1 })} ({smartSignals.primaryMagnet.isLong ? 'Longs Sweep' : 'Shorts Squeeze'})
                </span>
              </div>
            </div>

            {/* Support Pools */}
            <div className="pool-list-section">
              <div className="section-title text-secondary">Major Support Pools (Bids)</div>
              <div className="pool-level-header text-secondary font-mono">
                <span>Level</span>
                <span className="align-right">Size (Lev)</span>
                <span className="align-right">Dist.</span>
              </div>
              {smartSignals.supportPools.map((pool, idx) => (
                <div key={`support-${idx}`} className="pool-level-row">
                  <span className="price-level font-mono trend-up font-bold">${pool.price.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                  <span className="vol-size font-mono align-right">${(pool.volume / 1e6).toFixed(1)}M ({pool.leverage}x)</span>
                  <span className="distance font-mono align-right">-{pool.distancePct.toFixed(1)}%</span>
                </div>
              ))}
            </div>

            {/* Resistance Pools */}
            <div className="pool-list-section" style={{ marginTop: '16px' }}>
              <div className="section-title text-secondary">Major Resistance Pools (Asks)</div>
              <div className="pool-level-header text-secondary font-mono">
                <span>Level</span>
                <span className="align-right">Size (Lev)</span>
                <span className="align-right">Dist.</span>
              </div>
              {smartSignals.resistancePools.map((pool, idx) => (
                <div key={`resist-${idx}`} className="pool-level-row">
                  <span className="price-level font-mono trend-down font-bold">${pool.price.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                  <span className="vol-size font-mono align-right">${(pool.volume / 1e6).toFixed(1)}M ({pool.leverage}x)</span>
                  <span className="distance font-mono align-right">+{pool.distancePct.toFixed(1)}%</span>
                </div>
              ))}
            </div>

            {/* Setup Alert Message */}
            <div className={`setup-alert-box ${smartSignals.primaryMagnet.gravityScore >= 60 ? (smartSignals.primaryMagnet.isLong ? 'warning' : 'squeeze') : 'neutral'}`}>
              <div className="alert-title font-bold">
                {smartSignals.primaryMagnet.gravityScore >= 60 ? (smartSignals.primaryMagnet.isLong ? '⚠️ VOLATILITY WARNING' : '⚡ SHORT SQUEEZE ALIGNED') : '💡 RANGE TRADING ALERT'}
              </div>
              <p className="alert-desc font-mono">
                {smartSignals.primaryMagnet.gravityScore >= 60 
                  ? (smartSignals.primaryMagnet.isLong 
                    ? `${selectedToken} price is in close proximity (-${smartSignals.primaryMagnet.distancePct.toFixed(1)}%) to a massive $${(smartSignals.primaryMagnet.volume / 1e6).toFixed(1)}M liquidation cluster at $${smartSignals.primaryMagnet.price.toLocaleString()}. Expect a downside wick sweep to harvest this liquidity.`
                    : `Price is within +${smartSignals.primaryMagnet.distancePct.toFixed(1)}% of a major $${(smartSignals.primaryMagnet.volume / 1e6).toFixed(1)}M short liquidation band at $${smartSignals.primaryMagnet.price.toLocaleString()}. A push higher will trigger automated buying, accelerating a breakout.`)
                  : `Nearest major liquidity pool is a $${(smartSignals.primaryMagnet.volume / 1e6).toFixed(1)}M cluster at $${smartSignals.primaryMagnet.price.toLocaleString()} (${smartSignals.primaryMagnet.isLong ? '-' : '+'}${smartSignals.primaryMagnet.distancePct.toFixed(1)}%). Price is currently range-bound.`
                }
              </p>
            </div>

            {/* Automated Trade Recommendation */}
            {tradeRecommendation && (
              <div className="trade-setup-panel">
                <div className="section-title text-secondary">🤖 Smart Trade Recommendation</div>
                <div className="setup-details card bg-darker">
                  <div className="setup-title-row">
                    <span className={`direction-badge ${tradeRecommendation.direction.toLowerCase()}`}>
                      {tradeRecommendation.direction}
                    </span>
                    <strong className="setup-name">{tradeRecommendation.setupName}</strong>
                  </div>
                  <p className="strategy-desc text-secondary font-sans">
                    {tradeRecommendation.strategyDesc}
                  </p>
                  
                  <div className="setup-levels-grid font-mono">
                    <div className="level-item">
                      <span className="label">Rec. Entry</span>
                      <strong className="val text-cyan">${tradeRecommendation.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong>
                    </div>
                    <div className="level-item">
                      <span className="label">Take Profit</span>
                      <strong className="val trend-up">${tradeRecommendation.takeProfit.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong>
                    </div>
                    <div className="level-item">
                      <span className="label">Stop Loss</span>
                      <strong className="val trend-down">${tradeRecommendation.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong>
                    </div>
                    <div className="level-item">
                      <span className="label">R:R Ratio</span>
                      <strong className="val text-purple">{tradeRecommendation.rrRatio}:1</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Trade Execution Position Sizer */}
            {tradeRecommendation && (
              <div className="position-sizer-panel" style={{ marginTop: '16px' }}>
                <div className="section-title text-secondary">⚖️ Real-Time Position Sizer &amp; Risk Manager</div>
                <div className="sizer-card card bg-darker">
                  <div className="sizer-inputs">
                    <div className="input-box">
                      <label className="text-secondary">Balance (USD)</label>
                      <input 
                        type="number"
                        value={accountBalance}
                        onChange={(e) => setAccountBalance(parseFloat(e.target.value) || 0)}
                        className="input-field font-mono sizer-input"
                      />
                    </div>
                    <div className="input-box">
                      <label className="text-secondary">Max Risk (%)</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={riskPct}
                        onChange={(e) => setRiskPct(parseFloat(e.target.value) || 0)}
                        className="input-field font-mono sizer-input"
                      />
                    </div>
                  </div>
                  
                  <div className="sizer-results font-mono">
                    {(() => {
                      const riskAmount = accountBalance * (riskPct / 100);
                      const slDist = Math.max(0.1, tradeRecommendation.distanceToSLPct);
                      const posSize = riskAmount / (slDist / 100);
                      const leverageReq = posSize / accountBalance;
                      const profitEst = riskAmount * tradeRecommendation.rrRatio;
                      return (
                        <>
                          <div className="result-row">
                            <span className="label">Max Risk Amount:</span>
                            <span className="val text-red font-bold">${riskAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                          </div>
                          <div className="result-row">
                            <span className="label">Rec. Position Size:</span>
                            <span className="val text-cyan font-bold">${posSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          </div>
                          <div className="result-row">
                            <span className="label">Rec. Leverage:</span>
                            <span className="val text-yellow font-bold">{leverageReq.toFixed(1)}x</span>
                          </div>
                          <div className="result-row">
                            <span className="label">Est. Net Profit:</span>
                            <span className="val text-green font-bold">+${profitEst.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

      <style>{`
        .heatmap-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .view-subtitle {
          margin-top: 4px;
          font-size: 0.875rem;
        }
        .timeframe-selector {
          display: flex;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 3px;
        }
        .range-btn {
          border: none;
          background: transparent;
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: 6px;
          font-family: var(--font-display);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .range-btn:hover {
          color: var(--text-primary);
        }
        .range-btn.active {
          background: var(--bg-card-hover);
          color: var(--color-accent);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }
        
        .heatmap-stats {
          margin-top: 4px;
        }
        .stat-mini {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 16px;
        }
        .stat-mini .label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .stat-mini .value {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 1.4rem;
        }
        .stat-mini .desc {
          font-size: 0.65rem;
          color: var(--text-muted);
        }
        .text-purple {
          color: var(--color-accent);
        }
        .text-cyan {
          color: var(--color-info);
        }

        .heatmap-chart-card {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .title-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .flame-orange {
          color: var(--color-warning);
        }
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .legend-section {
          display: flex;
          gap: 16px;
          font-size: 0.75rem;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-secondary);
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .long-dot {
          background-color: var(--color-long);
          box-shadow: 0 0 4px var(--color-long-glow);
        }
        .short-dot {
          background-color: var(--color-short);
          box-shadow: 0 0 4px var(--color-short-glow);
        }
        .current-line-dot {
          width: 12px;
          height: 2px;
          background-color: var(--color-accent);
        }
        
        .svg-wrapper {
          position: relative;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          border: 1px solid var(--border-color);
          overflow: hidden;
          padding: 10px;
        }
        
        .heatmap-tooltip {
          background: var(--bg-card);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border-hover);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .tooltip-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 4px;
          margin-bottom: 4px;
        }
        .badge-indicator {
          font-size: 0.6rem;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 3px;
        }
        .badge-indicator.long {
          background: var(--color-long-glow);
          color: var(--color-long);
        }
        .badge-indicator.short {
          background: var(--color-short-glow);
          color: var(--color-short);
        }
        .tooltip-title .leverage {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .tooltip-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
        }
        .tooltip-row .label {
          color: var(--text-secondary);
        }
        .tooltip-row .value {
          font-weight: 600;
        }
        .tooltip-row .highlight {
          color: var(--color-warning);
        }

        .heatmap-guide {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          padding: 12px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.4;
          border-left: 3px solid var(--color-info);
        }
        .heatmap-guide strong {
          color: var(--text-primary);
        }
        .heatmap-selectors {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .selector-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .selector-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 600;
        }
        .leverage-filter-badges {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .filter-title {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 600;
        }
        .lev-filter-badge {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .lev-filter-badge:hover {
          color: var(--text-primary);
          border-color: var(--border-hover);
        }
        .lev-filter-badge.active {
          background: rgba(168, 85, 247, 0.08);
          border-color: var(--color-accent);
          color: var(--color-accent);
        }
        
        .cumulative-profile-card {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .card-header-profile {
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
        }
        .card-header-profile h3 {
          font-size: 1.1rem;
          color: var(--text-primary);
        }
        .profile-desc {
          font-size: 0.7rem;
          line-height: 1.4;
        }
        .profile-rows {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .profile-row-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .profile-row-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
        }
        .profile-bar-track {
          display: flex;
          height: 6px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.04);
          overflow: hidden;
        }
        .profile-bar-long {
          height: 100%;
        }
        .profile-bar-short {
          height: 100%;
        }
        .profile-bar-legend {
          display: flex;
          justify-content: space-between;
          font-size: 0.65rem;
        }

        .heatmap-layout {
          display: flex;
          flex-direction: column;
          gap: 24px;
          width: 100%;
        }
        .heatmap-right-sidebar {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          width: 100%;
        }
        @media (max-width: 1024px) {
          .heatmap-right-sidebar {
            grid-template-columns: 1fr;
          }
        }
        
        .smart-signals-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .gravity-meter-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          padding: 12px;
          border-radius: 8px;
        }
        .gravity-meter-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
        }
        .gravity-progress-bar {
          height: 6px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.04);
          overflow: hidden;
          margin: 4px 0;
        }
        .gravity-progress-fill {
          height: 100%;
          border-radius: 3px;
        }
        .gravity-direction {
          font-size: 0.65rem;
        }

        .pool-list-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .pool-list-section .section-title {
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .pool-level-header {
          display: grid;
          grid-template-columns: 1fr 1.2fr 0.8fr;
          font-size: 0.65rem;
          padding-bottom: 4px;
          border-bottom: 1px dashed var(--border-color);
        }
        .pool-level-row {
          display: grid;
          grid-template-columns: 1fr 1.2fr 0.8fr;
          font-size: 0.75rem;
          padding: 6px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
        }
        .pool-level-row:last-child {
          border-bottom: none;
        }
        
        .setup-alert-box {
          border-left: 3px solid transparent;
          padding: 10px;
          border-radius: 6px;
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .setup-alert-box.warning {
          border-left-color: var(--color-short);
          background: rgba(244, 63, 94, 0.04);
          color: var(--color-short);
        }
        .setup-alert-box.squeeze {
          border-left-color: var(--color-long);
          background: rgba(16, 185, 129, 0.04);
          color: var(--color-long);
        }
        .setup-alert-box.neutral {
          border-left-color: var(--color-accent);
          background: rgba(168, 85, 247, 0.04);
          color: var(--color-accent);
        }
        .setup-alert-box .alert-title {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .setup-alert-box .alert-desc {
          font-size: 0.65rem;
          line-height: 1.35;
          color: var(--text-secondary);
        }

        /* Wick Simulator */
        .wick-simulator-panel {
          margin-top: 14px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .simulator-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .sim-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
        }
        .sim-metrics {
          font-size: 0.75rem;
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .sim-metrics .divider {
          color: var(--border-color);
        }
        .slider-wrapper {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sim-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: var(--border-hover);
          outline: none;
        }
        .sim-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--color-warning);
          cursor: pointer;
          box-shadow: 0 0 6px rgba(245, 158, 11, 0.5);
        }
        .slider-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.65rem;
        }
        .current-price-label {
          color: var(--color-accent);
          font-weight: 700;
        }
        
        /* New intelligent additions styling */
        .bg-darker {
          background: rgba(0, 0, 0, 0.3) !important;
          border-color: rgba(255, 255, 255, 0.03) !important;
        }
        .trade-setup-panel {
          margin-top: 14px;
        }
        .setup-details {
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .setup-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .direction-badge {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          color: #ffffff;
        }
        .direction-badge.long {
          background: var(--color-long);
        }
        .direction-badge.short {
          background: var(--color-short);
        }
        .setup-name {
          font-size: 0.85rem;
          color: var(--text-primary);
        }
        .strategy-desc {
          font-size: 0.7rem;
          line-height: 1.45;
        }
        .setup-levels-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          border-top: 1px solid var(--border-color);
          padding-top: 8px;
          margin-top: 4px;
        }
        .level-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .level-item .label {
          font-size: 0.6rem;
          color: var(--text-secondary);
        }
        .level-item .val {
          font-size: 0.75rem;
        }
        
        .sizer-card {
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sizer-inputs {
          display: flex;
          gap: 12px;
        }
        .sizer-inputs .input-box {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .sizer-inputs .input-box label {
          font-size: 0.65rem;
          font-weight: 600;
        }
        .sizer-input {
          padding: 6px 10px;
          font-size: 0.75rem;
        }
        .sizer-results {
          display: flex;
          flex-direction: column;
          gap: 6px;
          border-top: 1px dashed var(--border-color);
          padding-top: 10px;
        }
        .result-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
        }
        .result-row .label {
          color: var(--text-secondary);
        }
        .text-red {
          color: var(--color-short);
        }
        
        @keyframes pingPulse {
          0% { stroke-width: 3px; r: 6; opacity: 1; }
          100% { stroke-width: 0.5px; r: 24; opacity: 0.2; }
        }
        .ping-flash-circle {
          animation: pingPulse 1.5s infinite ease-out;
        }

        @media (max-width: 768px) {
          .heatmap-selectors {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .selector-group {
            justify-content: space-between;
          }
          .leverage-filter-badges {
            flex-wrap: wrap;
          }
          .chart-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .legend-section {
            flex-wrap: wrap;
            gap: 8px;
          }
          .setup-levels-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .sizer-inputs {
            flex-direction: column;
            gap: 8px;
          }
          .timeframe-selector {
            width: 100%;
          }
          .range-btn {
            flex: 1;
            text-align: center;
            padding: 6px 4px;
            font-size: 0.7rem;
          }
          .svg-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .heatmap-svg {
            min-width: 780px;
            height: 320px;
            display: block;
          }
        }
      `}</style>
    </div>
  );
};
