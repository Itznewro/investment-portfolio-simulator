import "../App.css";
import logo from "../assets/logo.png";
import Chart from "../components/Chart";
import Topbar from "../components/Topbar";
import TradeCard from "../components/TradeCard";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const DEFAULT_WATCHLIST_SYMBOLS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"];

function normaliseWatchlistValue(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === "string") return item;
          return item?.symbol || item?.stock_symbol || item?.ticker || "";
        })
        .filter(Boolean);
    }
  } catch {
    // If it is not JSON, treat it like a comma separated list: AAPL,TSLA,NVDA
  }

  return String(value)
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean);
}

function getSavedWatchlistSymbols(userId) {
  const possibleKeys = [
    `watchlist_${userId}`,
    `ips_watchlist_${userId}`,
    `stock_watchlist_${userId}`,
    "watchlist",
    "stockWatchlist",
    "watchlistStocks",
  ];

  for (const key of possibleKeys) {
    const rawValue = localStorage.getItem(key);
    const symbols = normaliseWatchlistValue(rawValue)
      .map((symbol) => symbol.toUpperCase())
      .filter(Boolean);

    if (symbols.length > 0) {
      return [...new Set(symbols)];
    }
  }

  return DEFAULT_WATCHLIST_SYMBOLS;
}

function getEconomicEventUrl(event) {
  if (event?.url) return event.url;
  if (event?.link) return event.link;
  if (event?.sourceUrl) return event.sourceUrl;

  const query = [event?.country, event?.event, event?.indicator, "market news"]
    .filter(Boolean)
    .join(" ");

  return `https://www.google.com/search?tbm=nws&q=${encodeURIComponent(
    query || "economic calendar market news"
  )}`;
}

function DashboardPage() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [holdingPrices, setHoldingPrices] = useState({});
  const [holdingsValueLoading, setHoldingsValueLoading] = useState(false);

  const [dashboardWatchlistSymbols, setDashboardWatchlistSymbols] = useState(() =>
    getSavedWatchlistSymbols(user?.id)
  );
  const [watchlistData, setWatchlistData] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);

  const [economicEvents, setEconomicEvents] = useState([]);
  const [economicLoading, setEconomicLoading] = useState(true);

  const [hoveredChartPoint, setHoveredChartPoint] = useState(null);
  const [chartRefreshKey, setChartRefreshKey] = useState(0);

  const holdings = portfolioData?.holdings || [];
  const cashBalance = portfolioData?.portfolio?.cashBalance
    ? Number(portfolioData.portfolio.cashBalance)
    : 0;
  const transactions = portfolioData?.transactions || [];

  const formatCurrency = (value) =>
    `$${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  useEffect(() => {
    const syncWatchlistFromLocalStorage = () => {
      setDashboardWatchlistSymbols(getSavedWatchlistSymbols(user?.id));
    };

    syncWatchlistFromLocalStorage();

    window.addEventListener("storage", syncWatchlistFromLocalStorage);
    window.addEventListener("focus", syncWatchlistFromLocalStorage);

    return () => {
      window.removeEventListener("storage", syncWatchlistFromLocalStorage);
      window.removeEventListener("focus", syncWatchlistFromLocalStorage);
    };
  }, [user?.id]);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await fetch(`/api/portfolio/${user.id}`);
        const data = await response.json();
        setPortfolioData(data);
      } catch (error) {
        console.error("Error fetching portfolio:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchPortfolio();
  }, [user?.id]);

  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        setWatchlistLoading(true);

        const quoteResults = await Promise.all(
          dashboardWatchlistSymbols.map(async (symbol) => {
            const [quoteResponse, profileResponse] = await Promise.all([
              fetch(`/api/stocks/quote/${symbol}`),
              fetch(`/api/stocks/profile/${symbol}`),
            ]);

            const quoteData = await quoteResponse.json();
            const profileData = await profileResponse.json();

            return {
              symbol,
              current: Number(quoteData.c) || 0,
              percentChange: Number(quoteData.dp) || 0,
              logo: profileData?.logo || null,
              name: profileData?.name || "US Equity",
            };
          })
        );

        setWatchlistData(quoteResults);
      } catch (error) {
        console.error("Error fetching watchlist:", error);
        setWatchlistData([]);
      } finally {
        setWatchlistLoading(false);
      }
    };

    fetchWatchlist();
  }, [dashboardWatchlistSymbols]);

  useEffect(() => {
    const fetchEconomicEvents = async () => {
      try {
        setEconomicLoading(true);
        const response = await fetch("/api/economic-events");
        const data = await response.json();
        setEconomicEvents(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching economic events:", error);
        setEconomicEvents([]);
      } finally {
        setEconomicLoading(false);
      }
    };

    fetchEconomicEvents();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const savePortfolioSnapshot = async () => {
      try {
        const response = await fetch(`/api/history/snapshot/${user.id}`, {
          method: "POST",
        });

        if (!response.ok) {
          console.error("Snapshot save failed");
          return;
        }

        setChartRefreshKey((prev) => prev + 1);
      } catch (error) {
        console.error("Snapshot error:", error);
      }
    };

    const firstSnapshot = setTimeout(savePortfolioSnapshot, 3000);
    const interval = setInterval(savePortfolioSnapshot, 10 * 60 * 1000);

    return () => {
      clearTimeout(firstSnapshot);
      clearInterval(interval);
    };
  }, [user?.id]);

  useEffect(() => {
    const fetchHoldingPrices = async () => {
      if (!holdings.length) {
        setHoldingPrices({});
        return;
      }

      try {
        setHoldingsValueLoading(true);

        const priceEntries = await Promise.all(
          holdings.map(async (holding) => {
            const symbol = holding.stock_symbol;
            const response = await fetch(`/api/stocks/quote/${symbol}`);
            const data = await response.json();
            return [symbol, Number(data.c) || 0];
          })
        );

        setHoldingPrices(Object.fromEntries(priceEntries));
      } catch (error) {
        console.error("Error fetching holding prices:", error);
      } finally {
        setHoldingsValueLoading(false);
      }
    };

    fetchHoldingPrices();
  }, [portfolioData]);

  const refreshPortfolio = async () => {
    const refreshed = await fetch(`/api/portfolio/${user.id}`);
    const refreshedData = await refreshed.json();
    setPortfolioData(refreshedData);
  };

  const holdingsMarketValue = holdings.reduce((total, holding) => {
    const livePrice = holdingPrices[holding.stock_symbol] || 0;
    return total + Number(holding.quantity) * livePrice;
  }, 0);

  const portfolioValue = cashBalance + holdingsMarketValue;
  const assetsHeld = holdings.length;

  const totalCostBasis = holdings.reduce((total, holding) => {
    return (
      total +
      Number(holding.quantity || 0) * Number(holding.average_buy_price || 0)
    );
  }, 0);

  const unrealizedGain = holdingsMarketValue - totalCostBasis;
  const unrealizedGainPercent = totalCostBasis
    ? (unrealizedGain / totalCostBasis) * 100
    : 0;

  const marketMood = useMemo(() => {
    const positiveCount = watchlistData.filter(
      (stock) => stock.percentChange >= 0
    ).length;

    if (watchlistLoading) return "Loading";
    if (watchlistData.length === 0) return "Empty";

    return positiveCount >= Math.ceil(watchlistData.length / 2)
      ? "Positive"
      : "Mixed";
  }, [watchlistData, watchlistLoading]);

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="logo" className="logo-img" />
          <h2>IPSimulator</h2>
        </div>

        <nav className="sidebar-nav">
          <a className="nav-item active" href="/dashboard">
            Dashboard
          </a>
          <a className="nav-item" href="/portfolio">
            Portfolio
          </a>
          <a className="nav-item" href="/trade">
            Market
          </a>
          <a className="nav-item" href="/history">
            Transactions
          </a>
          <a className="nav-item" href="/settings">
            Settings
          </a>
        </nav>

        <div className="sidebar-card">
          <p className="sidebar-card-title">Start Trading</p>
          <p className="sidebar-card-text">
            Practice stock trading with virtual money.
          </p>
          <button className="sidebar-card-btn">Explore</button>
        </div>
      </aside>

      <main className="main-content dashboard-main-redesign">
        <Topbar />

        <section className="stats-row professional-stats-row">
          <Link
            to="/portfolio"
            className="stat-card metric-card metric-card-featured metric-link-card"
          >
            <div className="metric-card-top">
              <span className="metric-icon">◆</span>
              <p className="stat-label">Invested in Market</p>
            </div>
            <h3>
              {loading || holdingsValueLoading
                ? "Loading..."
                : formatCurrency(holdingsMarketValue)}
            </h3>
            <span className="stat-neutral">Live value of your holdings</span>
          </Link>

          <Link to="/portfolio" className="stat-card metric-card metric-link-card">
            <div className="metric-card-top">
              <span className="metric-icon">$</span>
              <p className="stat-label">Cash Balance</p>
            </div>
            <h3>{loading ? "Loading..." : formatCurrency(cashBalance)}</h3>
            <span className="stat-neutral">Ready to invest</span>
          </Link>

          <Link to="/portfolio" className="stat-card metric-card metric-link-card">
            <div className="metric-card-top">
              <span className="metric-icon">↗</span>
              <p className="stat-label">Unrealized Gain/Loss</p>
            </div>
            <h3>
              {loading || holdingsValueLoading
                ? "Loading..."
                : formatCurrency(unrealizedGain)}
            </h3>
            <span className={unrealizedGain >= 0 ? "stat-positive" : "stat-loss"}>
              {unrealizedGain >= 0 ? "+" : ""}
              {unrealizedGainPercent.toFixed(2)}% vs cost
            </span>
          </Link>

          <Link to="/history" className="stat-card metric-card metric-link-card">
            <div className="metric-card-top">
              <span className="metric-icon">▣</span>
              <p className="stat-label">Assets Held</p>
            </div>
            <h3>{loading ? "Loading..." : `${assetsHeld} Stocks`}</h3>
            <span className="stat-neutral">
              {transactions.length} Transactions
            </span>
          </Link>
        </section>

        <section className="dashboard-grid professional-dashboard-grid">
          <div className="dashboard-center">
            <div className="panel large-panel chart-panel pro-panel">
              <div className="chart-header">
                <div>
                  <p className="chart-subtitle">
                    {hoveredChartPoint ? hoveredChartPoint.time : "Balance"}
                  </p>

                  <h2>
                    {loading || holdingsValueLoading
                      ? "Loading..."
                      : formatCurrency(hoveredChartPoint?.value || portfolioValue)}
                  </h2>
                </div>

                <span className="panel-badge">Live portfolio</span>
              </div>

              <Chart
                userId={user.id}
                portfolioValue={portfolioValue}
                refreshKey={chartRefreshKey}
                onHoverPoint={setHoveredChartPoint}
                onLeaveChart={() => setHoveredChartPoint(null)}
              />
            </div>

            <div className="bottom-row professional-bottom-row">
              <div className="panel small-panel insight-panel economic-panel-redesign">
                <div className="panel-title-row">
                  <div>
                    <p className="panel-kicker">Macro Calendar</p>
                    <h3>Economic Events</h3>
                  </div>
                  <span className="panel-badge">
                    {economicEvents.length || 0} Events
                  </span>
                </div>

                {economicLoading ? (
                  <p className="placeholder-text">Loading economic events...</p>
                ) : economicEvents.length === 0 ? (
                  <p className="placeholder-text">No events available right now.</p>
                ) : (
                  <div className="events-list pro-events-list">
                    {economicEvents.map((event, index) => (
                      <a
                        key={index}
                        href={getEconomicEventUrl(event)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="event-row pro-event-row event-clickable"
                        title="Open related market news"
                      >
                        <div className="event-left pro-event-left">
                          <span className="event-dot"></span>
                          <div>
                            <p className="event-title">
                              {event.event || "Economic Event"}
                            </p>
                            <p className="event-country">
                              {event.country || "N/A"} • {event.indicator || "N/A"}
                            </p>
                          </div>
                        </div>

                        <div className="event-right">
                          <p className="event-time">{event.time || "TBA"}</p>
                          <p
                            className={`event-impact ${
                              event.impact === "High"
                                ? "high"
                                : event.impact === "Medium"
                                ? "medium"
                                : "low"
                            }`}
                          >
                            {event.impact || "Low"}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel small-panel insight-panel market-panel-redesign">
                <div className="panel-title-row">
                  <div>
                    <p className="panel-kicker">Watchlist</p>
                    <h3>Markets</h3>
                  </div>
                  <span
                    className={`panel-badge ${
                      marketMood === "Positive" ? "positive-badge" : ""
                    }`}
                  >
                    {marketMood}
                  </span>
                </div>

                {watchlistLoading ? (
                  <p className="placeholder-text">Loading market data...</p>
                ) : watchlistData.length === 0 ? (
                  <p className="placeholder-text">No watchlist stocks found.</p>
                ) : (
                  <div className="watchlist pro-watchlist">
                    {watchlistData.map((stock) => (
                      <Link
                        key={stock.symbol}
                        to={`/stocks/${stock.symbol}`}
                        className="watchlist-row pro-watchlist-row watchlist-clickable"
                      >
                        <div className="watchlist-left-pro">
                          {stock.logo ? (
                            <img
                              src={stock.logo}
                              alt={`${stock.symbol} logo`}
                              className="stock-avatar stock-avatar-img"
                            />
                          ) : (
                            <span className="stock-avatar">
                              {stock.symbol.charAt(0)}
                            </span>
                          )}
                          <div>
                            <p className="watchlist-symbol">{stock.symbol}</p>
                            <p className="watchlist-name">{stock.name || "US Equity"}</p>
                          </div>
                        </div>

                        <div className="watchlist-right">
                          <p className="watchlist-price">
                            {formatCurrency(stock.current)}
                          </p>
                          <p
                            className={
                              stock.percentChange >= 0
                                ? "watchlist-change positive"
                                : "watchlist-change negative"
                            }
                          >
                            {stock.percentChange >= 0 ? "+" : ""}
                            {stock.percentChange.toFixed(2)}%
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="dashboard-right professional-dashboard-right">
            <TradeCard
              user={user}
              portfolioData={portfolioData}
              cashBalance={cashBalance}
              onTradeComplete={refreshPortfolio}
            />

            <div className="panel right-panel thin order-notes-panel">
              <div className="panel-title-row">
                <div>
                  <p className="panel-kicker">Trading Guide</p>
                  <h3>Order Notes</h3>
                </div>
              </div>

              <div className="order-notes professional-order-notes">
                <p>Search by stock symbol before placing an order.</p>
                <p>Sell mode only displays stocks you already own.</p>
                <p>Quantity and amount automatically calculate each other.</p>
                <p>Every order includes a 0.50% simulator trading fee.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;
