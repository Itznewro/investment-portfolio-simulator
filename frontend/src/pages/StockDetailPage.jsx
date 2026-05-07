import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import logo from "../assets/logo.png";
import Topbar from "../components/Topbar";
import OrderBook from "../components/OrderBook";
import TradeCard from "../components/TradeCard";
import StockPriceChart from "../components/StockPriceChart";
import "../App.css";

function StockDetailPage() {
  const { symbol } = useParams();
  const user = JSON.parse(localStorage.getItem("user"));

  const [portfolioData, setPortfolioData] = useState(null);
  const [quote, setQuote] = useState(null);
  const [profile, setProfile] = useState(null);
  const [hoveredChartPoint, setHoveredChartPoint] = useState(null);

  const cashBalance = portfolioData?.portfolio?.cashBalance
    ? Number(portfolioData.portfolio.cashBalance)
    : 0;

  const holdings = portfolioData?.holdings || [];

  const currentHolding = holdings.find(
    (item) => item.stock_symbol === symbol?.toUpperCase()
  );

  const portfolioValue = cashBalance;

  const refreshPortfolio = async () => {
    if (!user?.id) return;

    const response = await fetch(`/api/portfolio/${user.id}`);
    const data = await response.json();
    setPortfolioData(data);
  };

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        const quoteRes = await fetch(`/api/stocks/quote/${symbol}`);
        const quoteData = await quoteRes.json();
        setQuote(quoteData);

        const profileRes = await fetch(`/api/stocks/profile/${symbol}`);
        const profileData = await profileRes.json();
        setProfile(profileData);
      } catch (error) {
        console.error("Stock detail error:", error);
      }
    };

    refreshPortfolio();
    fetchStockData();
  }, [symbol, user?.id]);

  const [recommendedStocks, setRecommendedStocks] = useState([]);

  useEffect(() => {
  const fetchRecommendedStocks = async () => {
    const symbols = ["MSFT", "NVDA", "TSLA"];

    try {
      const results = await Promise.all(
        symbols.map(async (item) => {
          const quoteRes = await fetch(`/api/stocks/quote/${item}`);
          const quote = await quoteRes.json();

          const profileRes = await fetch(`/api/stocks/profile/${item}`);
          const profile = await profileRes.json();

          return {
            symbol: item,
            logo: profile.logo,
            price: Number(quote.c) || 0,
            change: Number(quote.dp) || 0,
          };
        })
      );

      setRecommendedStocks(results);
    } catch (error) {
      console.error("Recommended stocks error:", error);
    }
  };

  fetchRecommendedStocks();
}, []);

  const lastPrice = Number(quote?.c) || 0;
  const high = Number(quote?.h) || 0;
  const low = Number(quote?.l) || 0;
  const change = Number(quote?.dp) || 0;


  const stockTransactions = (portfolioData?.transactions || []).filter(
  (tx) => tx.stock_symbol === symbol?.toUpperCase()
);

const visibleTransactions = stockTransactions.slice(0, 5);

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
            <button className="nav-item">Settings</button>
          </nav>
        </div>

        <div className="sidebar-card">
          <p className="sidebar-card-title">Stock Detail</p>
          <p className="sidebar-card-text">
            View stock price, order book, and trade controls.
          </p>
          <button className="sidebar-card-btn">Explore</button>
        </div>
      </aside>

      <main className="main-content">
        <Topbar />

        <section className="stock-detail-header">
          <div className="stock-detail-title">
            {profile?.logo ? (
              <img src={profile.logo} alt={symbol} />
            ) : (
              <div className="stock-detail-fallback">{symbol?.charAt(0)}</div>
            )}

            <div>
              <h1>{symbol?.toUpperCase()}</h1>
              <p>{profile?.name || "US Equity"}</p>
            </div>
          </div>

          <div className="stock-detail-metrics">
            <div>
              <p>Last Price</p>
              <strong>${lastPrice.toFixed(2)}</strong>
              <span className={change >= 0 ? "profit-text" : "loss-text"}>
                {change >= 0 ? "+" : ""}
                {change.toFixed(2)}%
              </span>
            </div>

            <div>
              <p>24H High</p>
              <strong>${high.toFixed(2)}</strong>
            </div>

            <div>
              <p>24H Low</p>
              <strong>${low.toFixed(2)}</strong>
            </div>
          </div>
        </section>

        <section className="stock-detail-layout">
          <div className="stock-detail-left">
            <div className="panel stock-chart-panel">
              <div className="chart-header">
                <div>
                <p className="chart-subtitle">
  {hoveredChartPoint ? hoveredChartPoint.time : "Price Chart"}
</p>

<h2>
  $
  {(hoveredChartPoint?.price || lastPrice).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}
</h2>
                </div>
              </div>

             <StockPriceChart
                 symbol={symbol}
                    onHoverPrice={setHoveredChartPoint}
                    />
            </div>

            <div className="panel open-orders-panel">
              <div className="open-orders-tabs">
                <button className="active">Open orders</button>
                
              </div>

              {currentHolding ? (
                <div className="open-order-item">
                  <div>
                    <strong>{symbol?.toUpperCase()} Position</strong>
                    <p>
                      Quantity: {Number(currentHolding.quantity).toFixed(4)} shares
                    </p>
                  </div>

                  <div>
                    <strong>
                      Avg Buy: ${Number(currentHolding.average_buy_price).toFixed(2)}
                    </strong>
                    <p>Current: ${lastPrice.toFixed(2)}</p>
                  </div>
                </div>
              ) : (
                <div className="no-open-orders">
                  <div className="empty-icon">▤</div>
                  <p>No open orders</p>
                </div>
              )}
            </div>

            <div className="panel stock-transactions-panel">
  <h3>Transactions</h3>

  {visibleTransactions.length === 0 ? (
    <p className="placeholder-text">No transactions for this stock yet.</p>
  ) : (
    <div className="stock-transaction-list">
      {visibleTransactions.map((tx) => {
        const isBuy = tx.transaction_type === "BUY";

        return (
          <div className="stock-transaction-row" key={tx.id}>
            {profile?.logo ? (
              <img src={profile.logo} alt={symbol} />
            ) : (
              <div className="stock-detail-fallback">{symbol?.charAt(0)}</div>
            )}

            <div>
              <strong>
                {symbol?.toUpperCase()} {tx.transaction_type}
              </strong>
             <p>
  {new Date(tx.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })}
</p>
            </div>

            <div className="stock-transaction-right">
              <strong className={isBuy ? "profit-text" : "loss-text"}>
                {isBuy ? "+" : "-"}${Number(tx.total_amount).toFixed(2)}
              </strong>
              <p>
                {isBuy ? "+" : "-"}
                {Number(tx.quantity).toFixed(4)} shares
              </p>
            </div>
          </div>
        );
      })}

      {stockTransactions.length > 5 && (
        <button className="see-all-btn">See all</button>
      )}
    </div>
  )}
</div>

<div className="panel you-may-like-panel">
  <h3>You may also like</h3>

  <div className="recommended-stock-grid">
    {recommendedStocks.map((item) => {
      const isUp = item.change >= 0;

      return (
        <Link
          to={`/stocks/${item.symbol}`}
          className="recommended-stock-card"
          key={item.symbol}
        >
          {item.logo ? (
            <img src={item.logo} alt={item.symbol} />
          ) : (
            <div className="stock-detail-fallback">{item.symbol[0]}</div>
          )}

          <p>{item.symbol}</p>

          <strong>
            ${item.price.toFixed(2)}
          </strong>

          <span className={isUp ? "profit-text" : "loss-text"}>
            {isUp ? "↗ +" : "↘ "}
            {item.change.toFixed(2)}%
          </span>
        </Link>
      );
    })}
  </div>
</div>
          </div>

         <div className="stock-detail-right">
  <TradeCard
    user={user}
    portfolioData={portfolioData}
    cashBalance={cashBalance}
    onTradeComplete={refreshPortfolio}
  />

  <OrderBook quote={quote} />
</div>
        </section>
      </main>
    </div>
  );
}

export default StockDetailPage;