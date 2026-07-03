/* eslint-disable */
// Service for generating high-fidelity mock data for Coinglass, Coinank & Glassnode dashboards

export interface TokenStats {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  openInterest: number;
  openInterestChange24h: number;
  fundingRate: number;
  longRatio: number;
  shortRatio: number;
}

export interface LiquidationEvent {
  id: string;
  timestamp: Date;
  symbol: string;
  exchange: string;
  side: 'long' | 'short';
  amountUsd: number;
  price: number;
  quantity: number;
}

export interface HeatmapNode {
  price: number;
  volume: number; // intensity/volume of liquidations
  leverage: number; // average leverage associated (e.g. 10x, 25x, 50x, 100x)
}

export interface FundingRateData {
  symbol: string;
  binance: number;
  bybit: number;
  okx: number;
  dydx: number;
}

export interface TimeframeRatio {
  timeframe: string;
  longs: number;
  shorts: number;
}

export interface OnChainMetricPoint {
  date: string;
  price: number;
  mvrv: number;
  exchangeFlow: number; // + is inflow, - is outflow
  activeAddresses: number;
}

// Initial mock base prices
const basePrices: Record<string, number> = {
  BTC: 67420.50,
  ETH: 3480.20,
  SOL: 145.75,
  XRP: 0.523,
  ADA: 0.442,
  DOGE: 0.128,
};

const tokenNames: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  XRP: 'Ripple',
  ADA: 'Cardano',
  DOGE: 'Dogecoin',
};

// Generates token statistics
export const getMarketStats = (): TokenStats[] => {
  return Object.keys(basePrices).map((symbol) => {
    const price = basePrices[symbol];
    const change24h = symbol === 'BTC' ? 2.45 : symbol === 'ETH' ? 1.82 : symbol === 'SOL' ? 5.67 : symbol === 'XRP' ? -1.12 : symbol === 'ADA' ? -0.45 : 3.21;
    const high24h = price * (1 + Math.max(0, change24h) / 100 + 0.012);
    const low24h = price * (1 - Math.max(0, -change24h) / 100 - 0.015);
    const volume24h = symbol === 'BTC' ? 28450120000 : symbol === 'ETH' ? 14890200000 : symbol === 'SOL' ? 3850000000 : symbol === 'XRP' ? 1120000000 : 420000000;
    const openInterest = symbol === 'BTC' ? 18450000000 : symbol === 'ETH' ? 10210000000 : symbol === 'SOL' ? 2120000000 : symbol === 'XRP' ? 620000000 : 180000000;
    const openInterestChange24h = symbol === 'BTC' ? 3.42 : symbol === 'ETH' ? -1.15 : symbol === 'SOL' ? 8.94 : symbol === 'XRP' ? 0.45 : -2.1;
    const fundingRate = symbol === 'BTC' ? 0.0105 : symbol === 'ETH' ? 0.0085 : symbol === 'SOL' ? 0.0185 : symbol === 'XRP' ? 0.0050 : 0.0120;
    
    // Sum of ratios = 100
    const longRatio = symbol === 'BTC' ? 51.4 : symbol === 'ETH' ? 49.8 : symbol === 'SOL' ? 53.2 : symbol === 'XRP' ? 48.6 : 50.2;
    const shortRatio = 100 - longRatio;

    return {
      symbol,
      name: tokenNames[symbol],
      price,
      change24h,
      high24h,
      low24h,
      volume24h,
      openInterest,
      openInterestChange24h,
      fundingRate,
      longRatio,
      shortRatio,
    };
  });
};

// Generates list of recent liquidations
export const getRecentLiquidations = (): LiquidationEvent[] => {
  const exchanges = ['Binance', 'Bybit', 'OKX', 'dYdX'];
  const symbols = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE'];
  const sides: ('long' | 'short')[] = ['long', 'short'];

  return Array.from({ length: 15 }).map((_, index) => {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const price = basePrices[symbol] * (1 + (Math.random() * 0.02 - 0.01));
    const side = sides[Math.floor(Math.random() * sides.length)];
    const amountUsd = Math.floor(Math.random() * 250000) + 5000;
    const quantity = amountUsd / price;
    const exchange = exchanges[Math.floor(Math.random() * exchanges.length)];

    return {
      id: `liq-${Date.now()}-${index}`,
      timestamp: new Date(Date.now() - index * 60000 * (Math.random() * 5 + 1)),
      symbol,
      exchange,
      side,
      amountUsd,
      price,
      quantity,
    };
  });
};

// Simulate real-time liquidation tick
export const generateLiveLiquidation = (): LiquidationEvent => {
  const exchanges = ['Binance', 'Bybit', 'OKX', 'HTX'];
  const symbols = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE'];
  const sides: ('long' | 'short')[] = ['long', 'short'];

  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const price = basePrices[symbol] * (1 + (Math.random() * 0.005 - 0.0025));
  const side = sides[Math.floor(Math.random() * sides.length)];
  
  // Power-law distribution for liquidation sizes (many small, a few massive)
  const rand = Math.random();
  let amountUsd = 1000;
  if (rand > 0.98) {
    amountUsd = Math.floor(Math.random() * 1500000) + 500000; // Giant liquidation
  } else if (rand > 0.85) {
    amountUsd = Math.floor(Math.random() * 400000) + 100000; // Big liquidation
  } else {
    amountUsd = Math.floor(Math.random() * 90000) + 3000;    // Standard liquidation
  }

  const quantity = amountUsd / price;
  const exchange = exchanges[Math.floor(Math.random() * exchanges.length)];

  return {
    id: `liq-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    timestamp: new Date(),
    symbol,
    exchange,
    side,
    amountUsd,
    price,
    quantity,
  };
};

// Liquidation heatmap - levels where liquidations are clustered
export const getLiquidationHeatmap = (symbol: string): HeatmapNode[] => {
  const currentPrice = basePrices[symbol] || 50000;
  const nodes: HeatmapNode[] = [];
  
  // Create cluster levels above and below current price
  // Leverage bands: 100x (close), 50x, 25x, 10x (further away)
  const leverageBands = [
    { leverage: 100, dist: 0.01 },
    { leverage: 50, dist: 0.02 },
    { leverage: 25, dist: 0.04 },
    { leverage: 10, dist: 0.10 }
  ];

  leverageBands.forEach((band) => {
    // Shorts liquidated if price goes UP
    const shortPrice = currentPrice * (1 + band.dist);
    // Longs liquidated if price goes DOWN
    const longPrice = currentPrice * (1 - band.dist);

    // Add multiple points around these price pools
    for (let i = -2; i <= 2; i++) {
      const spread = i * (currentPrice * 0.001);
      
      // Shorts liquidation cluster
      nodes.push({
        price: shortPrice + spread,
        volume: Math.floor(Math.random() * 5000000) * (band.leverage / 10), // higher leverage = higher volume pools sometimes
        leverage: band.leverage
      });

      // Longs liquidation cluster
      nodes.push({
        price: longPrice + spread,
        volume: Math.floor(Math.random() * 6000000) * (band.leverage / 10),
        leverage: band.leverage
      });
    }
  });

  // Sort by price
  return nodes.sort((a, b) => a.price - b.price);
};

// Funding rates for top tokens
export const getFundingRates = (): FundingRateData[] => {
  return Object.keys(basePrices).map((symbol) => {
    const baseRate = symbol === 'SOL' ? 0.018 : symbol === 'BTC' ? 0.010 : symbol === 'ETH' ? 0.008 : symbol === 'XRP' ? -0.005 : 0.005;
    return {
      symbol,
      binance: baseRate + (Math.random() * 0.004 - 0.002),
      bybit: baseRate + (Math.random() * 0.006 - 0.003),
      okx: baseRate + (Math.random() * 0.003 - 0.0015),
      dydx: baseRate + (Math.random() * 0.008 - 0.004),
    };
  });
};

// Timeframe Long/Short Ratios for a token
export const getTimeframeRatios = (symbol: string): TimeframeRatio[] => {
  // Ratios depend on symbol and standard fluctuations
  const baseLong = symbol === 'BTC' ? 51.2 : symbol === 'SOL' ? 53.8 : 49.5;
  const timeframes = ['5m', '15m', '30m', '1h', '4h', '12h', '24h'];

  return timeframes.map((tf) => {
    const variance = Math.random() * 4 - 2; // -2 to +2
    const longs = parseFloat((baseLong + variance).toFixed(2));
    const shorts = parseFloat((100 - longs).toFixed(2));
    return { timeframe: tf, longs, shorts };
  });
};

// On-Chain Metric historical data (simulates Glassnode metrics)
export const getOnChainMetrics = (symbol: string): OnChainMetricPoint[] => {
  const points: OnChainMetricPoint[] = [];
  const baseVal = basePrices[symbol] || 50000;
  const numDays = 30;
  
  const now = new Date();
  for (let i = numDays; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Simulate a price chart with some trends
    // Let's create a smooth sine-wave-like trend with random noise
    const trend = Math.sin((numDays - i) / 5) * 0.08;
    const noise = Math.random() * 0.03 - 0.015;
    const price = baseVal * (0.88 + trend + noise + (numDays - i) * 0.005);
    
    // MVRV Z-Score usually correlates with price but stretches in bubbles
    // Neutral = 1.0 to 1.8. Underpriced < 0.1. Overpriced > 3.0.
    const baseMvrv = symbol === 'BTC' ? 1.45 : symbol === 'ETH' ? 1.25 : 1.65;
    const mvrv = parseFloat((baseMvrv + trend * 10 + Math.random() * 0.2 - 0.1).toFixed(2));
    
    // Exchange Net Position change (inflows vs outflows) in USD millions
    // + values indicate inflows (potential sell pressure), - values indicate outflows (potential accumulation)
    const exchangeFlow = Math.floor((Math.random() * 150 - 75) + trend * 200);

    // Active Addresses (e.g. 800k to 1.2m for BTC, scaled down for others)
    const multiplier = symbol === 'BTC' ? 950000 : symbol === 'ETH' ? 450000 : symbol === 'SOL' ? 680000 : 120000;
    const activeAddresses = Math.floor(multiplier * (0.9 + trend + Math.random() * 0.15));

    points.push({
      date: dateStr,
      price: parseFloat(price.toFixed(symbol === 'XRP' || symbol === 'ADA' ? 4 : 2)),
      mvrv,
      exchangeFlow,
      activeAddresses,
    });
  }

  return points;
};
