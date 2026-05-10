import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import Topbar from "../components/Topbar";
import { Search, Settings, Bell } from "lucide-react";
import logo from "../assets/logo.png";
import "../App.css";

const logoMap = {
  AAPL: "apple.com",
  TSLA: "tesla.com",
  NVDA: "nvidia.com",
  META: "meta.com",
  MSFT: "microsoft.com",
  AMZN: "amazon.com",
  GOOGL: "google.com",
  GOOG: "google.com",
};

function PortfolioPage() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [portfolioData, setPortfolioData] = useState(null);
  const [holdingPrices, setHoldingPrices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await fetch(`/api/portfolio/${user.id}`);
        const data = await response.json();
        setPortfolioData(data);
      } catch (error) {
        console.error("Portfolio error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchPortfolio();
  }, [user?.id]);

  useEffect(() => {
    const fetchPrices = async () => {
      const holdings = portfolioData?.holdings || [];
      if (!holdings.length) return;

      const prices = await Promise.all(
        holdings.map(async (holding) => {
          const symbol = holding.stock_symbol;
          const response = await fetch(`/api/stocks/quote/${symbol}`);
          const data = await response.json();
          return [symbol, Number(data.c) || 0];
        })
      );

      setHoldingPrices(Object.fromEntries(prices));
    };

    fetchPrices();
  }, [portfolioData]);

  const holdings = portfolioData?.holdings || [];
  const cashBalance = Number(portfolioData?.portfolio?.cashBalance || 0);

  const enrichedHoldings = useMemo(() => {
    return holdings.map((holding) => {
      const symbol = holding.stock_symbol;
      const quantity = Number(holding.quantity) || 0;
      const avgBuyPrice = Number(holding.average_buy_price) || 0;
      const currentPrice = holdingPrices[symbol] || avgBuyPrice;

      const marketValue = quantity * currentPrice;
      const costBasis = quantity * avgBuyPrice;
      const profitLoss = marketValue - costBasis;
      const profitLossPercent =
        costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

      return {
        symbol,
        quantity,
        avgBuyPrice,
        currentPrice,
        marketValue,
        costBasis,
        profitLoss,
        profitLossPercent,
      };
    });
  }, [holdings, holdingPrices]);

  const totalHoldingsValue = enrichedHoldings.reduce(
    (sum, item) => sum + item.marketValue,
    0
  );

  const totalPortfolioValue = cashBalance + totalHoldingsValue;

  const totalProfitLoss = enrichedHoldings.reduce(
    (sum, item) => sum + item.profitLoss,
    0
  );

  const pieData = [
    { name: "Placed", value: totalHoldingsValue },
    { name: "Available", value: cashBalance },
  ];

  const allocationData = enrichedHoldings.map((item) => ({
    name: item.symbol,
    value: Number(item.marketValue.toFixed(2)),
  }));

  const chartData =
    enrichedHoldings.length > 0
      ? enrichedHoldings.map((item, index) => ({
          name: item.symbol,
          value: Number(item.marketValue.toFixed(2)),
          display: index + 1,
        }))
      : [
          { name: "Start", value: 0 },
          { name: "Now", value: 0 },
        ];

  const colors = ["#6741BF", "#7b5ce6", "#4f8cff", "#f59e0b", "#ef4444"];

  const getLogoUrl = (symbol) => {
    const domain = logoMap[symbol];
    return domain ? `https://logo.clearbit.com/${domain}` : null;
  };

  return (
    <div className="portfolio-shell">
     <aside className="sidebar">
  <div>
    <div className="sidebar-logo">
      <img src={logo} alt="logo" className="logo-img" />
      <h2>IPSimulator</h2>
    </div>

    <nav className="sidebar-nav">
      <a className="nav-item" href="/dashboard">Dashboard</a>
      <a className="nav-item active" href="/portfolio">Portfolio</a>
      <a className="nav-item" href="/trade">Market</a>
      <a className="nav-item" href="/history">Transactions</a>
      <a className="nav-item" href="/settings">Settings</a>
    </nav>
  </div>

  <div className="sidebar-card">
    <p className="sidebar-card-title">Portfolio View</p>
    <p className="sidebar-card-text">
      Track your holdings and unrealized returns.
    </p>
    <button className="sidebar-card-btn">Explore</button>
  </div>
</aside>

      <main className="main-content">
       <Topbar />

        <section className="portfolio-title-row">
        </section>

        <section className="portfolio-main-grid">
          <div className="portfolio-left">
            <div className="portfolio-overview-card-v2">
              <h3>Overview</h3>

              <div className="overview-card-grid-v2">
                <div className="overview-mini-card">
                  <p>Total Balance</p>
                  <h2>
                    ${totalPortfolioValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </h2>

                  <ResponsiveContainer width="100%" height={105}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        innerRadius={32}
                        outerRadius={45}
                        paddingAngle={4}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={entry.name} fill={colors[index]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="overview-stat-row">
                    <div>
                      <span>Placed</span>
                      <strong>${totalHoldingsValue.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Available</span>
                      <strong>${cashBalance.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                <div className="overview-mini-card">
                  <p>Unrealized Return</p>
                  <h2 className={totalProfitLoss >= 0 ? "profit-text" : "loss-text"}>
                    {totalProfitLoss >= 0 ? "+" : ""}$
                    {totalProfitLoss.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </h2>

                  <ResponsiveContainer width="100%" height={105}>
                    <PieChart>
                      <Pie
                        data={allocationData}
                        dataKey="value"
                        innerRadius={32}
                        outerRadius={45}
                        paddingAngle={4}
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={entry.name} fill={colors[index % colors.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="overview-stat-row">
                    <div>
                      <span>Overall</span>
                      <strong>
                        {totalProfitLoss >= 0 ? "+" : ""}
                        {totalPortfolioValue > 0
                          ? ((totalProfitLoss / totalPortfolioValue) * 100).toFixed(2)
                          : "0.00"}
                        %
                      </strong>
                    </div>
                    <div>
                      <span>Portfolio</span>
                      <strong>{enrichedHoldings.length} stocks</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="my-assets-card-v2">
              <div className="assets-header-v2">
                <h3>My Assets</h3>
                <select>
                  <option>Stocks</option>
                </select>
              </div>

              {loading ? (
                <p className="placeholder-text">Loading portfolio...</p>
              ) : enrichedHoldings.length === 0 ? (
                <p className="placeholder-text">No holdings yet.</p>
              ) : (
                <div className="asset-list-v2">
                  {enrichedHoldings.map((item) => {
                    const logoUrl = getLogoUrl(item.symbol);
                    const isProfit = item.profitLoss >= 0;

                    return (
                      <div className="asset-row-v2" key={item.symbol}>
                        <div className="asset-name-v2">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={item.symbol}
                              onError={(e) => (e.currentTarget.style.display = "none")}
                            />
                          ) : (
                            <div className="asset-fallback">{item.symbol[0]}</div>
                          )}

                          <div>
                            <h4>{item.symbol}</h4>
                            <p>Qty: {item.quantity.toFixed(4)}</p>
                          </div>
                        </div>

                        <div className="asset-price-v2">
                          <strong>${item.marketValue.toFixed(2)}</strong>
                          <p className={isProfit ? "profit-text" : "loss-text"}>
                            {isProfit ? "+" : ""}${item.profitLoss.toFixed(2)}
                          </p>
                        </div>

                   <div className="asset-return-v2">
  <p className={isProfit ? "profit-text" : "loss-text"}>
    {isProfit ? "+" : ""}
    {item.profitLossPercent.toFixed(2)}%
  </p>
</div>

<div className="asset-menu-dots">⋮</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="portfolio-right">
            <div className="current-market-card">
              <h3>Current Market</h3>

              <div className="market-mini-row">
                {enrichedHoldings.slice(0, 4).map((item) => {
                  const isProfit = item.profitLoss >= 0;

                  return (
                    <div className="market-mini-card" key={item.symbol}>
                      <h4>{item.symbol}</h4>
                      <p className={isProfit ? "profit-text" : "loss-text"}>
                        {isProfit ? "+" : ""}
                        {item.profitLossPercent.toFixed(2)}%
                      </p>
                      <div>
                        <button>Short</button>
                        <button>Buy</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="stock-watchlist-card-v2">
              <div className="watchlist-title-v2">
                <h3>Stock Watchlist</h3>
              </div>

              <div className="watchlist-total-row">
                <p>
                  Total Investments:{" "}
                  <strong>${totalHoldingsValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}</strong>
                </p>

                <select>
                  <option>All Stocks</option>
                </select>
              </div>

              <div className="watchlist-tabs-v2">
                <button>Day</button>
                <button>Week</button>
                <button>Month</button>
                <button className="active">Year</button>
                <button>All Time</button>
              </div>

              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="portfolioArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6741BF" stopOpacity={0.35} />
<stop offset="100%" stopColor="#6741BF" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" stroke="#9f9f9f" />
                  <YAxis stroke="#9f9f9f" />
                  <Tooltip
                    contentStyle={{
                      background: "#111111",
                      border: "1px solid #2f2f2f",
                      borderRadius: "12px",
                      color: "#ffffff",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#6741BF"
                    fill="url(#portfolioArea)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default PortfolioPage;