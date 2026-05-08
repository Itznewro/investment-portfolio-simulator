import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SlidersHorizontal, Star } from "lucide-react";
import Topbar from "../components/Topbar";
import logo from "../assets/logo.png";
import "../App.css";

const STOCK_GROUPS = {
  top: ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL", "NFLX", "AMD", "INTC", "BABA", "ORCL", "CRM"],
  gainers: ["CRM", "ORCL", "NVDA", "META", "MSFT", "GOOGL", "AMZN", "NFLX", "TSLA", "AMD", "INTC", "BABA"],
  movers: ["TSLA", "NVDA", "AMD", "AAPL", "META", "BABA", "NFLX", "INTC", "CRM", "ORCL", "MSFT", "AMZN"],
};

const COMPANY_FALLBACKS = {
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
};

const TAB_LABELS = {
  top: "Top Stocks",
  gainers: "Top Gainers",
  movers: "Market Movers",
};

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "N/A";

  return `$${number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function readWatchlist(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${url}`);
  return response.json();
}

async function fetchStockData(symbol) {
  try {
    const [quoteResult, profileResult] = await Promise.allSettled([
      fetchJson(`/api/stocks/quote/${symbol}`),
      fetchJson(`/api/stocks/profile/${symbol}`),
    ]);

    const quote =
      quoteResult.status === "fulfilled" && quoteResult.value
        ? quoteResult.value
        : {};

    const profile =
      profileResult.status === "fulfilled" && profileResult.value
        ? profileResult.value
        : {};

    const currentPrice = Number(quote.c) || 0;
    const previousClose = Number(quote.pc) || 0;

    const dayChangePercent =
      Number.isFinite(Number(quote.dp)) && Number(quote.dp) !== 0
        ? Number(quote.dp)
        : previousClose > 0 && currentPrice > 0
        ? ((currentPrice - previousClose) / previousClose) * 100
        : 0;

    return {
      symbol,
      name: profile.name || COMPANY_FALLBACKS[symbol] || symbol,
      logo: profile.logo || null,
      price: currentPrice,
      previousClose,
      dayChangePercent,
      loaded: true,
    };
  } catch (error) {
    console.error(`Failed loading ${symbol}:`, error);

    return {
      symbol,
      name: COMPANY_FALLBACKS[symbol] || symbol,
      logo: null,
      price: 0,
      previousClose: 0,
      dayChangePercent: 0,
      loaded: true,
      failed: true,
    };
  }
}

function TradePage() {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("top");
  const [visibleCount, setVisibleCount] = useState(5);
  const [stocksBySymbol, setStocksBySymbol] = useState({});
  const [loading, setLoading] = useState(false);
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [marketNews, setMarketNews] = useState([]);
  const [marketStatus, setMarketStatus] = useState(null);

  const watchlistKey = `marketWatchlist:${user?.id || "guest"}`;

  const [watchlist, setWatchlist] = useState(() => readWatchlist(watchlistKey));

  useEffect(() => {
    setWatchlist(readWatchlist(watchlistKey));
  }, [watchlistKey]);

  useEffect(() => {
    setVisibleCount(5);
  }, [activeTab, showWatchlistOnly]);

  const activeSymbols = useMemo(() => {
    const symbols = STOCK_GROUPS[activeTab] || STOCK_GROUPS.top;

    if (showWatchlistOnly) {
      return symbols.filter((symbol) => watchlist.includes(symbol));
    }

    return symbols;
  }, [activeTab, showWatchlistOnly, watchlist]);

  const visibleSymbols = useMemo(() => {
    return activeSymbols.slice(0, visibleCount);
  }, [activeSymbols, visibleCount]);

  const visibleSymbolsKey = visibleSymbols.join(",");

  useEffect(() => {
    let cancelled = false;

    const loadStocks = async () => {
      if (!visibleSymbols.length) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const missingSymbols = visibleSymbols.filter(
          (symbol) => !stocksBySymbol[symbol]
        );

        if (missingSymbols.length === 0) return;

        const loadedStocks = await Promise.all(
          missingSymbols.map((symbol) => fetchStockData(symbol))
        );

        if (cancelled) return;

        const nextData = {};
        loadedStocks.forEach((stock) => {
          nextData[stock.symbol] = stock;
        });

        setStocksBySymbol((prev) => ({
          ...prev,
          ...nextData,
        }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadStocks();

    return () => {
      cancelled = true;
    };
  }, [visibleSymbolsKey]);

  useEffect(() => {
    const fetchMarketSideData = async () => {
      try {
        const [statusResult, newsResult] = await Promise.allSettled([
          fetchJson("/api/stocks/market/status"),
          fetchJson("/api/stocks/market/news"),
        ]);

        if (statusResult.status === "fulfilled") {
          setMarketStatus(statusResult.value);
        }

        if (newsResult.status === "fulfilled") {
          setMarketNews(Array.isArray(newsResult.value) ? newsResult.value : []);
        }
      } catch (error) {
        console.error("Market side data error:", error);
      }
    };

    fetchMarketSideData();
  }, []);

  const stockRows = useMemo(() => {
    const rows = visibleSymbols.map((symbol) => {
      return (
        stocksBySymbol[symbol] || {
          symbol,
          name: COMPANY_FALLBACKS[symbol] || symbol,
          logo: null,
          price: 0,
          previousClose: 0,
          dayChangePercent: 0,
          loaded: false,
        }
      );
    });

    if (activeTab === "gainers") {
      return [...rows].sort(
        (a, b) => Number(b.dayChangePercent) - Number(a.dayChangePercent)
      );
    }

    if (activeTab === "movers") {
      return [...rows].sort(
        (a, b) =>
          Math.abs(Number(b.dayChangePercent)) -
          Math.abs(Number(a.dayChangePercent))
      );
    }

    return rows;
  }, [visibleSymbols, stocksBySymbol, activeTab]);

  const toggleWatchlist = (symbol) => {
    setWatchlist((prev) => {
      const exists = prev.includes(symbol);

      const next = exists
        ? prev.filter((item) => item !== symbol)
        : [...prev, symbol];

      localStorage.setItem(watchlistKey, JSON.stringify(next));
      return next;
    });
  };

  const handleBrowseMore = () => {
    setVisibleCount((prev) => Math.min(prev + 5, activeSymbols.length));
  };

  const handleBuyClick = (symbol) => {
    navigate(`/stocks/${symbol}`);
  };

  const marketMover = stockRows.find((stock) => stock.loaded) || stockRows[0];

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">
            <img src={logo} alt="logo" className="logo-img" />
            <h2>IPSimulator</h2>
          </div>

          <nav className="sidebar-nav">
            <Link className="nav-item" to="/dashboard">
              Dashboard
            </Link>
            <Link className="nav-item" to="/portfolio">
              Portfolio
            </Link>
            <Link className="nav-item active" to="/trade">
              Market
            </Link>
            <Link className="nav-item" to="/history">
              Transactions
            </Link>
            <Link className="nav-item" to="/settings">
              Settings
            </Link>
          </nav>
        </div>

        <div className="sidebar-card">
          <p className="sidebar-card-title">Market View</p>
          <p className="sidebar-card-text">
            Browse stocks, track prices, and build your watchlist.
          </p>
          <button className="sidebar-card-btn">Explore</button>
        </div>
      </aside>

      <main className="main-content">
        <Topbar title="Market" />

        <section className="trade-page-grid">
          <div className="trade-market-left">
            <div className="trade-market-card">
              <h1>Stocks</h1>

              <div className="trade-filter-tabs">
                <button
                  className={`filter-icon-btn ${
                    showWatchlistOnly ? "watchlist-filter-active" : ""
                  }`}
                  onClick={() => setShowWatchlistOnly((prev) => !prev)}
                  title="Show watchlist only"
                >
                  <SlidersHorizontal size={18} />
                </button>

                {Object.entries(TAB_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    className={activeTab === key ? "active" : ""}
                    onClick={() => setActiveTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="stock-table-head">
                <span>Name</span>
                <span>Market price</span>
                <span>Day change</span>
                <span>Prev close</span>
                <span></span>
                <span></span>
              </div>

              {showWatchlistOnly && stockRows.length === 0 ? (
                <p className="placeholder-text market-empty-text">
                  No stocks in your watchlist yet. Click the star beside a stock
                  to add it.
                </p>
              ) : (
                stockRows.map((stock) => {
                  const isPositive = Number(stock.dayChangePercent) >= 0;
                  const isWatched = watchlist.includes(stock.symbol);

                  return (
                    <div className="stock-list-row" key={stock.symbol}>
                      <Link
                        to={`/stocks/${stock.symbol}`}
                        className="stock-list-name"
                      >
                        <div className="stock-avatar">
                          {stock.logo && (
                            <img
                              src={stock.logo}
                              alt={stock.symbol}
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                                const fallback =
                                  event.currentTarget.parentElement.querySelector(
                                    ".stock-list-fallback"
                                  );

                                if (fallback) fallback.style.display = "flex";
                              }}
                            />
                          )}

                          <span
                            className="stock-list-fallback"
                            style={{
                              display: stock.logo ? "none" : "flex",
                            }}
                          >
                            {stock.symbol.charAt(0)}
                          </span>
                        </div>

                        <div>
                          <strong>{stock.name}</strong>
                          <p>{stock.symbol}</p>
                        </div>
                      </Link>

                      <strong>
                        {!stock.loaded ? "Loading..." : formatMoney(stock.price)}
                      </strong>

                      <span
                        className={isPositive ? "profit-text" : "loss-text"}
                      >
                        {!stock.loaded
                          ? "Loading..."
                          : `${isPositive ? "↗" : "↘"} ${Number(
                              stock.dayChangePercent
                            ).toFixed(2)}%`}
                      </span>

                      <strong>
                        {!stock.loaded
                          ? "Loading..."
                          : formatMoney(stock.previousClose)}
                      </strong>

                      <button
                        className="stock-buy-link"
                        onClick={() => handleBuyClick(stock.symbol)}
                      >
                        Buy
                      </button>

                      <button
                        className={`stock-star-btn ${
                          isWatched ? "active" : ""
                        }`}
                        onClick={() => toggleWatchlist(stock.symbol)}
                        aria-label={
                          isWatched
                            ? `Remove ${stock.symbol} from watchlist`
                            : `Add ${stock.symbol} to watchlist`
                        }
                      >
                        <Star
                          size={21}
                          fill={isWatched ? "currentColor" : "none"}
                        />
                      </button>
                    </div>
                  );
                })
              )}

              {visibleCount < activeSymbols.length && (
                <button
                  className="browse-all-btn"
                  onClick={handleBrowseMore}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Browse more"}
                </button>
              )}
            </div>

            <div className="market-update-card">
              <h2>Stock Market Update</h2>

              <div className="market-update-stats">
                <div>
                  <p>Market</p>
                  <h3>{marketStatus?.exchange || "US"}</h3>
                </div>

                <div>
                  <p>Status</p>
                  <h3>{marketStatus?.isOpen ? "Open" : "Closed"}</h3>
                </div>

                <div>
                  <p>Watchlist</p>
                  <h3>{watchlist.length} Stocks</h3>
                </div>
              </div>

              <p>
                Track major US stocks, view live quote data, and save stocks to
                your personal watchlist using the star button.
              </p>
            </div>
          </div>

          <div className="trade-market-right">
            <div className="quick-actions-card">
              <h3>Market Mover</h3>

              {marketMover ? (
                <div className="market-mover-content">
                  {marketMover.logo ? (
                    <img
                      src={marketMover.logo}
                      alt={marketMover.symbol}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span>{marketMover.symbol?.charAt(0)}</span>
                  )}

                  <div>
                    <strong>{marketMover.symbol}</strong>
                    <p>{marketMover.name}</p>
                  </div>

                  <small
                    className={
                      Number(marketMover.dayChangePercent) >= 0
                        ? "profit-text"
                        : "loss-text"
                    }
                  >
                    {Number(marketMover.dayChangePercent) >= 0 ? "+" : ""}
                    {Number(marketMover.dayChangePercent || 0).toFixed(2)}%
                  </small>
                </div>
              ) : (
                <p>No mover data available.</p>
              )}
            </div>

            <div className="market-update-card">
              <h2>Latest Market News</h2>

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
                      <strong>{news.headline || "Market News"}</strong>
                      <p>{news.summary || "Read more about this update."}</p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default TradePage;