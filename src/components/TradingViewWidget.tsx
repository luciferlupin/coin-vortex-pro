/* eslint-disable */
import React, { useEffect, useRef } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  isLightTheme: boolean;
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  symbol,
  isLightTheme,
}) => {
  const containerId = `tradingview_chart_container_${symbol}`;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initWidget = () => {
      if ((window as any).TradingView) {
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: symbol === 'XAU' ? 'OANDA:XAUUSD' : `BINANCE:${symbol}USDT`,
          interval: '240', // 4h default
          timezone: 'Etc/UTC',
          theme: isLightTheme ? 'light' : 'dark',
          style: '1', // Candlestick style
          locale: 'en',
          toolbar_bg: isLightTheme ? '#f8fafc' : '#090b0e',
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          container_id: containerId,
          studies: [
            'RSI@tv-basicstudies',
            'MASimple@tv-basicstudies'
          ],
        });
      }
    };

    // Check if script is already present
    const existingScript = document.getElementById('tradingview-widget-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'tradingview-widget-script';
      script.src = 'https://s3.tradingview.com/tv.js';
      script.type = 'text/javascript';
      script.async = true;
      script.onload = () => {
        initWidget();
      };
      document.head.appendChild(script);
    } else {
      // If script is already loaded, initialize directly
      initWidget();
    }

    const currentContainer = containerRef.current;

    return () => {
      // Clear the container contents on unmount or update to prevent multiple widgets piling up
      if (currentContainer) {
        currentContainer.innerHTML = '';
      }
    };
  }, [symbol, isLightTheme]);

  return (
    <div className="tradingview-widget-wrapper" style={{ height: '100%', width: '100%' }}>
      <div 
        id={containerId} 
        ref={containerRef}
        style={{ height: '100%', width: '100%', borderRadius: '8px', overflow: 'hidden' }} 
      />
    </div>
  );
};
