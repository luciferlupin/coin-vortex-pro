import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import type { DashboardView } from './components/Sidebar';
import { Overview } from './components/Overview';
import { LiquidationHeatmap } from './components/LiquidationHeatmap';
import { FundingRates } from './components/FundingRates';
import { LongShortRatios } from './components/LongShortRatios';
import { OnChainMetrics } from './components/OnChainMetrics';
import { Calculators } from './components/Calculators';
import { TradingCharts } from './components/TradingCharts';
import { LiquidationsHub } from './components/LiquidationsHub';
import { OptionsMarket } from './components/OptionsMarket';
import { SystemSettings } from './components/SystemSettings';
import { HyperliquidHub } from './components/HyperliquidHub';
import { getMarketStats, getRecentLiquidations, connectLiveLiquidations, connectBinanceMarketData } from './services/apiService';
import type { TokenStats, LiquidationEvent } from './services/apiService';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [selectedToken, setSelectedToken] = useState<string>('BTC');
  const [isLightTheme, setIsLightTheme] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  
  // Market statistics state
  const [tokens, setTokens] = useState<TokenStats[]>([]);
  // Recent liquidations feed state
  const [liquidations, setLiquidations] = useState<LiquidationEvent[]>([]);

  // Initialize live data & WebSockets
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const stats = await getMarketStats();
        setTokens(stats);
        const recentLiqs = await getRecentLiquidations();
        setLiquidations(recentLiqs);
      } catch (error) {
        console.error('Failed to load initial stats:', error);
      }
    };
    loadInitialData();

    // Poll market statistics every 8 seconds to get live price, OI, volume, and funding rate changes
    const statsInterval = setInterval(async () => {
      try {
        const stats = await getMarketStats();
        setTokens(stats);
      } catch (error) {
        console.error('Failed to poll market stats:', error);
      }
    }, 8000);

    // Subscribe to live liquidations websocket stream
    const ws = connectLiveLiquidations((newLiq) => {
      setLiquidations((prevLiqs) => {
        const list = [newLiq, ...prevLiqs];
        if (list.length > 50) list.pop();
        return list;
      });
    });

    // Subscribe to live binance market data WebSocket
    const binanceMarketWs = connectBinanceMarketData((updates) => {
      setTokens((prevTokens) => {
        return prevTokens.map((token) => {
          const update = updates[token.symbol];
          if (update) {
            const nextPrice = update.price !== undefined ? update.price : token.price;
            let nextOI = token.openInterest;
            if (update.openInterest !== undefined) {
              nextOI = update.openInterest * nextPrice;
            }
            return {
              ...token,
              ...update,
              openInterest: nextOI,
            };
          }
          return token;
        });
      });
    });

    return () => {
      clearInterval(statsInterval);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      if (binanceMarketWs && binanceMarketWs.readyState === WebSocket.OPEN) {
        binanceMarketWs.close();
      }
    };
  }, []);

  // Sync theme with body class
  useEffect(() => {
    if (isLightTheme) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [isLightTheme]);

  const activeTokenStats = tokens.find((t) => t.symbol === selectedToken);

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <Sidebar
        currentView={currentView}
        onChangeView={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        tokens={tokens}
        selectedToken={selectedToken}
        onSelectToken={setSelectedToken}
      />

      {/* Main viewport */}
      <div className="main-content">
        <Header
          tokens={tokens}
          selectedToken={selectedToken}
          onSelectToken={setSelectedToken}
          isLightTheme={isLightTheme}
          onToggleTheme={() => setIsLightTheme(!isLightTheme)}
        />

        {/* View render router */}
        <main className="content-body">
          {currentView === 'overview' && (
            <Overview
              selectedToken={selectedToken}
              tokenStats={activeTokenStats}
              liquidations={liquidations}
              isLightTheme={isLightTheme}
            />
          )}

          {currentView === 'charts' && (
            <TradingCharts
              selectedToken={selectedToken}
              isLightTheme={isLightTheme}
            />
          )}

          {currentView === 'liquidations' && (
            <LiquidationsHub
              selectedToken={selectedToken}
              isLightTheme={isLightTheme}
              liquidations={liquidations}
            />
          )}

          {currentView === 'options' && (
            <OptionsMarket
              selectedToken={selectedToken}
              currentPrice={activeTokenStats?.price}
            />
          )}

          {currentView === 'settings' && (
            <SystemSettings />
          )}

          {currentView === 'heatmap' && (
            <LiquidationHeatmap
              selectedToken={selectedToken}
              tokenStats={activeTokenStats}
              isLightTheme={isLightTheme}
              liquidations={liquidations}
            />
          )}

          {currentView === 'funding' && (
            <FundingRates
              selectedToken={selectedToken}
              tokens={tokens}
              isLightTheme={isLightTheme}
            />
          )}

          {currentView === 'ratios' && (
            <LongShortRatios
              selectedToken={selectedToken}
              tokenStats={activeTokenStats}
              isLightTheme={isLightTheme}
            />
          )}

          {currentView === 'onchain' && (
            <OnChainMetrics
              selectedToken={selectedToken}
              tokenStats={activeTokenStats}
              isLightTheme={isLightTheme}
            />
          )}

          {currentView === 'calculators' && (
            <Calculators
              selectedToken={selectedToken}
              tokenStats={activeTokenStats}
            />
          )}

          {currentView === 'hyperliquid' && (
            <HyperliquidHub
              selectedToken={selectedToken}
              isLightTheme={isLightTheme}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
