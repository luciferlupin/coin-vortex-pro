import React from 'react';
import {
  LayoutDashboard,
  Flame,
  Percent,
  ArrowUpDown,
  Activity,
  Calculator,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Layers,
  Settings,
  BarChart3,
  Zap,
} from 'lucide-react';
import type { TokenStats } from '../services/apiService';

export type DashboardView = 'overview' | 'charts' | 'liquidations' | 'heatmap' | 'funding' | 'ratios' | 'options' | 'onchain' | 'calculators' | 'settings' | 'hyperliquid';

interface SidebarProps {
  currentView: DashboardView;
  onChangeView: (view: DashboardView) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  tokens: TokenStats[];
  selectedToken: string;
  onSelectToken: (symbol: string) => void;
}

interface NavItem {
  id: DashboardView;
  label: string;
  icon: React.ComponentType<{ size: number }>;
  color: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onChangeView,
  collapsed,
  onToggleCollapsed,
  tokens,
  selectedToken,
  onSelectToken,
}) => {
  const menuItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: 'var(--color-accent)' },
    { id: 'hyperliquid', label: 'Hyperliquid Hub', icon: Zap, color: 'var(--color-info)' },
    { id: 'charts', label: 'Trading Charts', icon: TrendingUp, color: 'var(--color-info)' },
    { id: 'liquidations', label: 'Liquidation Stats', icon: BarChart3, color: 'var(--color-short)' },
    { id: 'heatmap', label: 'Liquidation Heatmap', icon: Flame, color: 'var(--color-short)' },
    { id: 'funding', label: 'Funding Rates', icon: Percent, color: 'var(--color-warning)' },
    { id: 'ratios', label: 'Long/Short Ratios', icon: ArrowUpDown, color: 'var(--color-long)' },
    { id: 'options', label: 'Options Market', icon: Layers, color: 'var(--color-accent)' },
    { id: 'onchain', label: 'On-Chain Analytics', icon: Activity, color: 'var(--color-info)' },
    { id: 'calculators', label: 'Derivative Calculator', icon: Calculator, color: 'var(--text-secondary)' },
    { id: 'settings', label: 'System Settings', icon: Settings, color: 'var(--text-muted)' },
  ];

  return (
    <aside className={`sidebar-container ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-nav">
        {/* Watchlist Coin Selector */}
        <div className="sidebar-section-title">
          {!collapsed ? 'MARKET WATCHLIST' : 'WATCH'}
        </div>
        <div className="sidebar-coin-selector">
          {tokens.slice(0, 7).map((token) => {
            const isActive = token.symbol === selectedToken;
            const isUp = token.change24h >= 0;
            return (
              <button
                key={token.symbol}
                onClick={() => onSelectToken(token.symbol)}
                className={`coin-row-btn ${isActive ? 'active' : ''}`}
                title={`${token.name} (${token.symbol})`}
              >
                {!collapsed ? (
                  <>
                    <div className="coin-row-left">
                      <span className="coin-row-sym font-mono">{token.symbol}</span>
                      <span className="coin-row-name">{token.name}</span>
                    </div>
                    <div className="coin-row-right">
                      <span className="coin-row-price font-mono">
                        ${token.price.toLocaleString(undefined, { minimumFractionDigits: token.symbol === 'XRP' || token.symbol === 'ADA' ? 3 : 1, maximumFractionDigits: token.symbol === 'XRP' || token.symbol === 'ADA' ? 4 : 2 })}
                      </span>
                      <span className={`coin-row-change font-mono ${isUp ? 'trend-up' : 'trend-down'}`}>
                        {isUp ? '+' : ''}{token.change24h.toFixed(2)}%
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="coin-row-sym-collapsed font-mono">{token.symbol}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="sidebar-section-title">
          {!collapsed ? 'TERMINAL VIEWS' : 'VIEWS'}
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`nav-button ${isActive ? 'active' : ''}`}
              title={item.label}
              style={{
                '--hover-color': item.color,
              } as React.CSSProperties}
            >
              <div className="icon-wrapper" style={{ color: isActive ? item.color : undefined }}>
                <Icon size={20} />
              </div>
              {!collapsed && <span className="nav-label">{item.label}</span>}
              {isActive && !collapsed && <div className="active-indicator" style={{ backgroundColor: item.color }} />}
            </button>
          );
        })}
      </div>

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="footer-promo">
            <TrendingUp size={16} className="promo-icon" />
            <div className="promo-text">
              <span className="title">Derivatives API</span>
              <span className="desc">Access real-time feeds</span>
            </div>
          </div>
        )}
        <button onClick={onToggleCollapsed} className="collapse-btn" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <style>{`
        .sidebar-container {
          width: 260px;
          background: var(--bg-sidebar);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px 8px;
          transition: width var(--transition-normal);
          flex-shrink: 0;
        }
        .sidebar-container.collapsed {
          width: 68px;
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .nav-button {
          display: flex;
          align-items: center;
          width: 100%;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-secondary);
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all var(--transition-fast);
          position: relative;
          text-align: left;
          outline: none;
        }
        .nav-button:hover {
          color: var(--text-primary);
          background: var(--bg-card-hover);
          border-color: rgba(255, 255, 255, 0.03);
        }
        .nav-button.active {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.04);
          font-weight: 500;
        }
        .icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: color var(--transition-fast);
        }
        .collapsed .icon-wrapper {
          margin: 0 auto;
        }
        .nav-label {
          margin-left: 12px;
          font-size: 0.875rem;
          font-family: var(--font-display);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .active-indicator {
          position: absolute;
          right: 8px;
          width: 4px;
          height: 16px;
          border-radius: 2px;
        }
        .sidebar-footer {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 8px;
        }
        .footer-promo {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(168, 85, 247, 0.05);
          border: 1px dashed rgba(168, 85, 247, 0.2);
          border-radius: 8px;
          padding: 10px;
        }
        .promo-icon {
          color: var(--color-accent);
        }
        .promo-text {
          display: flex;
          flex-direction: column;
        }
        .promo-text .title {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-primary);
          font-family: var(--font-display);
        }
        .promo-text .desc {
          font-size: 0.65rem;
          color: var(--text-muted);
        }
        .collapse-btn {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .collapse-btn:hover {
          color: var(--text-primary);
          border-color: var(--text-secondary);
        }
        .sidebar-section-title {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 1px;
          color: var(--text-muted);
          padding: 8px 12px 4px 12px;
          margin-top: 10px;
          font-family: var(--font-display);
        }
        .sidebar-coin-selector {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 0 4px;
          margin-bottom: 12px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
        }
        .coin-row-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-secondary);
          padding: 8px 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all var(--transition-fast);
          outline: none;
          text-align: left;
        }
        .coin-row-btn:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }
        .coin-row-btn.active {
          background: rgba(255, 255, 255, 0.04);
          border-left: 2px solid var(--color-accent);
          color: var(--text-primary);
        }
        .coin-row-left {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .coin-row-sym {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .coin-row-sym-collapsed {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 auto;
          padding: 4px 0;
          text-align: center;
          width: 100%;
        }
        .coin-row-btn.active .coin-row-sym-collapsed {
          color: var(--color-accent);
        }
        .coin-row-name {
          font-size: 0.65rem;
          color: var(--text-muted);
        }
        .coin-row-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        .coin-row-price {
          font-size: 0.75rem;
          font-weight: 600;
        }
        .coin-row-change {
          font-size: 0.65rem;
          font-weight: 600;
        }
      `}</style>
    </aside>
  );
};
