import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Star, SlidersHorizontal } from "lucide-react";
import logo from "../assets/logo.png";
import Topbar from "../components/Topbar";
import TradeCard from "../components/TradeCard";
import "../App.css";

const watchlistSymbols = [
  "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL", "NFLX", "AMD", "INTC",
  "BABA", "ORCL", "CRM", "ADBE", "PYPL", "UBER", "DIS", "NKE", "KO", "PEP",
  "WMT", "COST", "JPM", "BAC", "V", "MA", "XOM", "CVX", "BA", "GE"
];

const fallbackNames = {
  AAPL: "Apple Inc",
  MSFT: "Microsoft Corp",
  NVDA: "NVIDIA Corp",
  TSLA: "Tesla Inc",
  AMZN: "Amazon.com Inc",
  META: "Meta Platforms Inc",
  GOOGL: "Alphabet Inc",
  NFLX: "Netflix Inc",
  AMD: "Advanced Micro Devices Inc",
  INTC: "Intel Corp",
  BABA: "Alibaba Group Holding Ltd",
  ORCL: "Oracle Corp",
  CRM: "Salesforce Inc",
  ADBE: "Adobe Inc",
  PYPL: "PayPal Holdings Inc",
  UBER: "Uber Technologies Inc",
  DIS: "Walt Disney Co",
  NKE: "Nike Inc",
  KO: "Coca-Cola Co",
  PEP: "PepsiCo Inc",
  WMT: "Walmart Inc",
  COST: "Costco Wholesale Corp",
  JPM: "JPMorgan Chase & Co",
  BAC: "Bank of America Corp",
  V: "Visa Inc",
  MA: "Mastercard Inc",
  XOM: "Exxon Mobil Corp",
  CVX: "Chevron Corp",
  BA: "Boeing Co",
  GE: "General Electric Co",
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function formatMoney(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return "N/A";
  }

  return `$${number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getWatchlistKey(userId) {
  return `ipsimulator-watchlist-${userId || "guest"}`;
}

function loadSavedWatchlist(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

async function getJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed request: ${url}`);
  }

  return response.json();
}

async function fetchOneStock(symbol) {
  try {
    const [quoteResult, profileResult] = await Promise.allSettled([
      getJson(`/api/stocks/quote/${symbol}`),
      getJson(`/api/stocks/profile/${symbol}`),
    ]);

    const quote =
      quoteResult.status === "fulfilled" && quoteResult.value
        ? quoteResult.value
        : {};

    const profile =
      profileResult.status === "fulfilled" && profileResult.value
        ? profileResult.value
        : {};

    const price = Number(quote.c);
    const previousClose = Number(quote.pc);

    const validPrice = Number.isFinite(price) && price > 0;
    const validPrevClose = Number.isFinite(previousClose) && previousClose > 0;

    const calculatedChange =
      validPrice && validPrevClose
        ? ((price - previousClose) / previousClose) * 100
        : 0;

    return {
      symbol,
      name: profile.name || fallbackNames[symbol] || symbol,
      logo: profile.logo || null,
      price: validPrice ? price : null,
      change:
        Number.isFinite(Number(quote.dp)) && Number(quote.dp) !== 0
          ? Number(quote.dp)
          : calculatedChange,
      previousClose: validPrevClose ? previousClose : null,
      loaded: true,
    };
  } catch (error) {
    console.error(`Stock fetch failed for ${symbol}:`, error);

    return {
      symbol,
      name: fallbackNames[symbol] || symbol,
      logo: null,
      price: null,
      change: 0,
      previousClose: null,
      loaded: true,
      failed: true,
    };
  }
}

function TradePage() {
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  const [portfolioData, setPortfolioData] = useState(null);
  const [stocksBySymbol, setStocksBySymbol] = useState({});
  const stocksBySymbolRef = useRef(stocksBySymbol);
  const [activeTab, setActiveTab] = useState("TOP");
  const [visibleCount, setVisibleCount] = useState(5);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [marketStatus, setMarketStatus] = useState(null);
  const [marketNews, setMarketNews] = useState([]);
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);

  const watchlistKey = getWatchlistKey(userId);
  const [savedWatchlist, setSavedWatchlist] = useState(() =>
    loadSavedWatchlist(watchlistKey)
  );

  const cashBalance = portfolioData?.portfolio?.cashBalance
    ? Number(portfolioData.portfolio.cashBalance)
    : 0;

  const refreshPortfolio = async () => {
    if (!userId) return;

    const response = await fetch(`/api/portfolio/${userId}`);
    const data = await response.json();
    setPortfolioData(data);
  };

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!userId) return;

      const response = await fetch(`/api/portfolio/${userId}`);
      const data = await response.json();
      setPortfolioData(data);
    };

    fetchPortfolio();
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => {
      setSavedWatchlist(loadSavedWatchlist(watchlistKey));
    });
  }, [watchlistKey]);

  useEffect(() => {
    stocksBySymbolRef.current = stocksBySymbol;
  }, [stocksBySymbol]);

  const activeSymbols = useMemo(() => {
    if (showWatchlistOnly) {
      return watchlistSymbols.filter((symbol) => savedWatchlist.includes(symbol));
    }

    return watchlistSymbols;
  }, [showWatchlistOnly, savedWatchlist]);

  const symbolsToShow = useMemo(() => {
    return activeSymbols.slice(0, visibleCount);
  }, [activeSymbols, visibleCount]);

  const symbolsToShowKey = symbolsToShow.join("|");

  useEffect(() => {
    let cancelled = false;
    const visibleSymbols = symbolsToShowKey ? symbolsToShowKey.split("|") : [];

    const loadVisibleStocks = async () => {
      const missingSymbols = visibleSymbols.filter(
        (symbol) => !stocksBySymbolRef.current[symbol]?.loaded
      );

      if (missingSymbols.length === 0) return;

      try {
        setLoadingStocks(true);

        for (const symbol of missingSymbols) {
          const stock = await fetchOneStock(symbol);

          if (cancelled) return;

          setStocksBySymbol((prev) => {
            const next = {
              ...prev,
              [symbol]: stock,
            };

            stocksBySymbolRef.current = next;
            return next;
          });

          await delay(120);
        }
      } finally {
        if (!cancelled) {
          setLoadingStocks(false);
        }
      }
    };

    loadVisibleStocks();

    return () => {
      cancelled = true;
    };
  }, [symbolsToShowKey]);

  useEffect(() => {
    const fetchMarketExtras = async () => {
      try {
        const [statusResult, newsResult] = await Promise.allSettled([
          getJson("/api/stocks/market/status"),
          getJson("/api/stocks/market/news"),
        ]);

        if (statusResult.status === "fulfilled") {
          setMarketStatus(statusResult.value);
        }

        if (newsResult.status === "fulfilled") {
          setMarketNews(Array.isArray(newsResult.value) ? newsResult.value : []);
        }
      } catch (error) {
        console.error("Market extras error:", error);
      }
    };

    fetchMarketExtras();
  }, []);

  const visibleStocks = useMemo(() => {
    let rows = symbolsToShow.map((symbol) => {
      return (
        stocksBySymbol[symbol] || {
          symbol,
          name: fallbackNames[symbol] || symbol,
          logo: null,
          price: null,
          change: 0,
          previousClose: null,
          loaded: false,
        }
      );
    });

    if (activeTab === "GAINERS") {
      rows = rows.sort((a, b) => Number(b.change) - Number(a.change));
    }

    if (activeTab === "MOVERS") {
      rows = rows.sort(
        (a, b) => Math.abs(Number(b.change)) - Math.abs(Number(a.change))
      );
    }

    return rows;
  }, [symbolsToShow, stocksBySymbol, activeTab]);

  const loadedStocks = useMemo(() => {
    return Object.values(stocksBySymbol).filter((stock) => stock.loaded);
  }, [stocksBySymbol]);

  const topMover = loadedStocks.length
    ? [...loadedStocks].sort((a, b) => Number(b.change) - Number(a.change))[0]
    : null;

  const downMover = loadedStocks.length
    ? [...loadedStocks].sort((a, b) => Number(a.change) - Number(b.change))[0]
    : null;

  const toggleWatchlist = (symbol) => {
    setSavedWatchlist((prev) => {
      const alreadySaved = prev.includes(symbol);

      const next = alreadySaved
        ? prev.filter((item) => item !== symbol)
        : [...prev, symbol];

      localStorage.setItem(watchlistKey, JSON.stringify(next));
      return next;
    });
  };

  const toggleWatchlistOnly = () => {
    setShowWatchlistOnly((prev) => !prev);
    setVisibleCount(5);
  };

  const selectTab = (nextTab) => {
    if (activeTab === nextTab) return;

    setActiveTab(nextTab);
    setVisibleCount(5);
  };

  const canBrowseMore = visibleCount < activeSymbols.length;

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">
            <img src={logo} alt="logo" className="logo-img" />
            <h2>IPSimulator</h2>
          </div>

          <nav className="sidebar-nav">
            <Link className="nav-item" to="/dashboard">Dashboard</Link>
            <Link className="nav-item" to="/portfolio">Portfolio</Link>
            <Link className="nav-item active" to="/trade">Market</Link>
            <Link className="nav-item" to="/history">Transactions</Link>
            <a className="nav-item" href="/settings">Settings</a>
          </nav>
        </div>

        <div className="sidebar-card">
          <p className="sidebar-card-title">Trade Center</p>
          <p className="sidebar-card-text">
            Search stocks and practice buy/sell orders.
          </p>
          <button className="sidebar-card-btn">Explore</button>
        </div>
      </aside>

      <main className="main-content">
        <Topbar />

        <section className="trade-page-grid">
          <div className="trade-market-left">
            <div className="trade-market-card">
              <h1>Stocks</h1>

              <div className="trade-filter-tabs">
                <button
                  className={`filter-icon-btn ${showWatchlistOnly ? "active" : ""}`}
                  onClick={toggleWatchlistOnly}
                  title="Show watchlist only"
                >
                  <SlidersHorizontal size={18} />
                </button>

                <button
                  className={activeTab === "TOP" ? "active" : ""}
                  onClick={() => selectTab("TOP")}
                >
                  Top Stocks
                </button>

                <button
                  className={activeTab === "GAINERS" ? "active" : ""}
                  onClick={() => selectTab("GAINERS")}
                >
                  Top Gainers
                </button>

                <button
                  className={activeTab === "MOVERS" ? "active" : ""}
                  onClick={() => selectTab("MOVERS")}
                >
                  Market Movers
                </button>
              </div>

              <div className="stock-table-head">
                <span>Name</span>
                <span>Market price</span>
                <span>Day change</span>
                <span>Prev close</span>
                <span></span>
                <span></span>
              </div>

              {showWatchlistOnly && activeSymbols.length === 0 ? (
                <p className="placeholder-text market-empty-text">
                  No stocks in your watchlist yet. Click the star beside a stock
                  to add it.
                </p>
              ) : (
                <div className="stock-list">
                  {visibleStocks.map((stock) => {
                    const isUp = Number(stock.change) >= 0;
                    const isSaved = savedWatchlist.includes(stock.symbol);

                    return (
                      <div className="stock-list-row" key={stock.symbol}>
                        <Link
                          to={`/stocks/${stock.symbol}`}
                          className="stock-list-name"
                        >
                          <div className="stock-icon-wrap">
                            {stock.logo && (
                              <img
                                src={stock.logo}
                                alt={stock.symbol}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  const fallback =
                                    e.currentTarget.parentElement.querySelector(
                                      ".stock-list-fallback"
                                    );

                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                            )}

                            <div
                              className="stock-list-fallback"
                              style={{ display: stock.logo ? "none" : "flex" }}
                            >
                              {stock.symbol[0]}
                            </div>
                          </div>

                          <div>
                            <strong>{stock.name}</strong>
                            <p>{stock.symbol}</p>
                          </div>
                        </Link>

                        <strong>
                          {!stock.loaded ? "Loading..." : formatMoney(stock.price)}
                        </strong>

                        <p className={isUp ? "profit-text" : "loss-text"}>
                          {!stock.loaded
                            ? "Loading..."
                            : `${isUp ? "↗ " : "↘ "}${Number(stock.change).toFixed(2)}%`}
                        </p>

                        <strong>
                          {!stock.loaded
                            ? "Loading..."
                            : formatMoney(stock.previousClose)}
                        </strong>

                        <Link
                          to={`/stocks/${stock.symbol}`}
                          className="stock-buy-link"
                        >
                          Buy
                        </Link>

                        <button
                          className={`stock-star-btn ${isSaved ? "active" : ""}`}
                          onClick={() => toggleWatchlist(stock.symbol)}
                          title={
                            isSaved
                              ? "Remove from watchlist"
                              : "Add to watchlist"
                          }
                        >
                          <Star
                            size={18}
                            fill={isSaved ? "currentColor" : "none"}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {canBrowseMore && (
                <button
                  className="browse-all-btn"
                  disabled={loadingStocks}
                  onClick={() => setVisibleCount((prev) => prev + 5)}
                >
                  {loadingStocks ? "Loading..." : "Browse more"}
                </button>
              )}

              {!canBrowseMore && activeSymbols.length > 5 && (
                <button
                  className="browse-all-btn"
                  onClick={() => setVisibleCount(5)}
                >
                  Show less
                </button>
              )}
            </div>

            <div className="market-update-card">
              <h2>Stock Market Update</h2>

              <div className="market-update-stats">
                <div className="market-mover-box">
                  <p>Top mover</p>

                  {topMover ? (
                    <div className="market-mover-content">
                      {topMover.logo ? (
                        <img src={topMover.logo} alt={topMover.symbol} />
                      ) : (
                        <span>{topMover.symbol[0]}</span>
                      )}

                      <strong>{topMover.symbol}</strong>
                      <small className="profit-text">
                        {Number(topMover.change) >= 0 ? "+" : ""}
                        {Number(topMover.change).toFixed(2)}%
                      </small>
                    </div>
                  ) : (
                    <strong>N/A</strong>
                  )}
                </div>

                <div className="market-mover-box">
                  <p>Down mover</p>

                  {downMover ? (
                    <div className="market-mover-content">
                      {downMover.logo ? (
                        <img src={downMover.logo} alt={downMover.symbol} />
                      ) : (
                        <span>{downMover.symbol[0]}</span>
                      )}

                      <strong>{downMover.symbol}</strong>
                      <small className="loss-text">
                        {Number(downMover.change).toFixed(2)}%
                      </small>
                    </div>
                  ) : (
                    <strong>N/A</strong>
                  )}
                </div>

                <div>
                  <p>Market status</p>
                  <strong className={marketStatus?.isOpen ? "profit-text" : "loss-text"}>
                    {marketStatus?.isOpen ? "Market Open" : "Market Closed"}
                  </strong>
                </div>
              </div>

              <h3>Latest market news</h3>

              {marketNews.length === 0 ? (
                <p>No market news available right now.</p>
              ) : (
                <div className="market-news-list">
                  {marketNews.map((news) => (
                    <a
                      key={news.id || news.url}
                      href={news.url}
                      target="_blank"
                      rel="noreferrer"
                      className="market-news-item"
                    >
                      <strong>{news.headline}</strong>
                      <p>{news.summary?.slice(0, 120)}...</p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="trade-market-right">
            <TradeCard
              user={user}
              portfolioData={portfolioData}
              cashBalance={cashBalance}
              onTradeComplete={refreshPortfolio}
            />

            <div className="quick-actions-card">
              <h3>Quick Actions</h3>
              <p>• Buy or sell stocks using virtual balance</p>
              <p>• Search by stock symbol</p>
              <p>• Open stock detail pages later</p>
              <p>• Track all orders in History</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default TradePage;
