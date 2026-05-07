import { useEffect, useMemo, useState } from "react";
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

function TradePage() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [portfolioData, setPortfolioData] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [activeTab, setActiveTab] = useState("TOP");
  const [visibleCount, setVisibleCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [marketStatus, setMarketStatus] = useState(null);
  const [marketNews, setMarketNews] = useState([]);

  const cashBalance = portfolioData?.portfolio?.cashBalance
    ? Number(portfolioData.portfolio.cashBalance)
    : 0;

  const refreshPortfolio = async () => {
    const response = await fetch(`/api/portfolio/${user.id}`);
    const data = await response.json();
    setPortfolioData(data);
  };

  useEffect(() => {
    if (user?.id) refreshPortfolio();
  }, [user?.id]);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setLoading(true);

        const data = await Promise.all(
          watchlistSymbols.map(async (symbol) => {
            const quoteRes = await fetch(`/api/stocks/quote/${symbol}`);
            const quote = await quoteRes.json();

            const profileRes = await fetch(`/api/stocks/profile/${symbol}`);
            const profile = await profileRes.json();

        

            return {
              symbol,
              name: profile.name || symbol,
              logo: profile.logo,
              price: Number(quote.c) || 0,
              change: Number(quote.dp) || 0,
              previousClose: Number(quote.pc) || 0,
            };
          })
        );

        setStocks(data);
      } catch (error) {
        console.error("Stock list error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  useEffect(() => {
  const fetchMarketExtras = async () => {
    try {
      const statusRes = await fetch("/api/stocks/market/status");
      const statusData = await statusRes.json();
      setMarketStatus(statusData);

      const newsRes = await fetch("/api/stocks/market/news");
      const newsData = await newsRes.json();
      setMarketNews(Array.isArray(newsData) ? newsData : []);
    } catch (error) {
      console.error("Market extras error:", error);
    }
  };

  fetchMarketExtras();
}, []);

  const visibleStocks = useMemo(() => {
  let filtered = [...stocks];

  if (activeTab === "GAINERS") {
    filtered = filtered
      .filter((s) => s.change > 0)
      .sort((a, b) => b.change - a.change);
  }

  if (activeTab === "MOVERS") {
    filtered = filtered.sort(
      (a, b) => Math.abs(b.change) - Math.abs(a.change)
    );
  }

  return filtered.slice(0, visibleCount);
}, [stocks, activeTab, visibleCount]);

   const topMover = stocks.length
  ? [...stocks].sort((a, b) => b.change - a.change)[0]
  : null;

const downMover = stocks.length
  ? [...stocks].sort((a, b) => a.change - b.change)[0]
  : null; 

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
          <p className="sidebar-card-text">Search stocks and practice buy/sell orders.</p>
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
                <button className="filter-icon-btn">
                  <SlidersHorizontal size={18} />
                </button>

                <button
                  className={activeTab === "TOP" ? "active" : ""}
                  onClick={() => setActiveTab("TOP")}
                >
                  Top Stocks
                </button>

                <button
                  className={activeTab === "GAINERS" ? "active" : ""}
                  onClick={() => setActiveTab("GAINERS")}
                >
                  Top Gainers
                </button>

                <button
                  className={activeTab === "MOVERS" ? "active" : ""}
                  onClick={() => setActiveTab("MOVERS")}
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

              {loading ? (
                <p className="placeholder-text">Loading stocks...</p>
              ) : (
                <div className="stock-list">
                  {visibleStocks.map((stock) => {
                    const isUp = stock.change >= 0;

                    return (
                      <div className="stock-list-row" key={stock.symbol}>
                        <Link to={`/stocks/${stock.symbol}`} className="stock-list-name">
                          {stock.logo ? (
                            <img src={stock.logo} alt={stock.symbol} />
                          ) : (
                            <div className="stock-list-fallback">{stock.symbol[0]}</div>
                          )}

                          <div>
                            <strong>{stock.name}</strong>
                            <p>{stock.symbol}</p>
                          </div>
                        </Link>

                        <strong>${stock.price.toFixed(2)}</strong>

                        <p className={isUp ? "profit-text" : "loss-text"}>
                          {isUp ? "↗ " : "↘ "}
                          {stock.change.toFixed(2)}%
                        </p>

                        <strong>${stock.previousClose.toFixed(2)}</strong>

                        <button className="stock-buy-link">Buy</button>

                        <Star size={18} className="stock-star" />
                      </div>
                    );
                  })}
                </div>
              )}

              <button
  className="browse-all-btn"
  onClick={() => {
    if (visibleCount >= stocks.length) {
      setVisibleCount(5);
    } else {
      setVisibleCount((prev) => prev + 10);
    }
  }}
>
  {visibleCount >= stocks.length ? "Show less" : "Browse more"}
</button>
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
          <small className="profit-text">+{topMover.change.toFixed(2)}%</small>
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
          <small className="loss-text">{downMover.change.toFixed(2)}%</small>
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
          key={news.id}
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