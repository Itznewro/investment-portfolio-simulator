import "../App.css";
import logo from "../assets/logo.png";
import { useEffect, useMemo, useState } from "react";

function DashboardPage() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [tradeType, setTradeType] = useState("BUY");
  const [stockSymbol, setStockSymbol] = useState("");
  const [quantity, setQuantity] = useState("");

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

    if (user?.id) {
      fetchPortfolio();
    }
  }, [user?.id]);

  const cashBalance = portfolioData?.portfolio?.cashBalance
    ? Number(portfolioData.portfolio.cashBalance)
    : 0;

  const holdings = portfolioData?.holdings || [];
  const transactions = portfolioData?.transactions || [];
  const assetsHeld = holdings.length;
  const portfolioValue = cashBalance;
  const todaysGain = 0;

  const mockStockPrices = {
    AAPL: 212.45,
    TSLA: 171.88,
    MSFT: 428.12,
    NVDA: 118.76,
    AMZN: 182.21,
    GOOGL: 167.34,
    META: 503.11,
  };

  const normalizedSymbol = stockSymbol.trim().toUpperCase();
  const selectedPrice = mockStockPrices[normalizedSymbol] || 0;
  const parsedQuantity = Number(quantity) || 0;
  const subtotal = selectedPrice * parsedQuantity;
  const fee = subtotal * 0.005;
  const total = tradeType === "BUY" ? subtotal + fee : subtotal - fee;

  const orderMessage = useMemo(() => {
    if (!normalizedSymbol) return "Search and select a stock symbol.";
    if (!selectedPrice) return "Stock not found in sample list yet.";
    if (!parsedQuantity) return "Enter a quantity to preview the order.";
    if (tradeType === "BUY" && total > cashBalance) {
      return "Insufficient balance for this order.";
    }
    return `${tradeType} order preview ready.`;
  }, [normalizedSymbol, selectedPrice, parsedQuantity, tradeType, total, cashBalance]);

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="logo" className="logo-img" />
          <h2>IPSimulator</h2>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item active">Dashboard</button>
          <button className="nav-item">Portfolio</button>
          <button className="nav-item">Markets</button>
          <button className="nav-item">Economic Calendar</button>
          <button className="nav-item">History</button>
          <button className="nav-item">Settings</button>
        </nav>

        <div className="sidebar-card">
          <p className="sidebar-card-title">Start Trading</p>
          <p className="sidebar-card-text">
            Practice stock trading with virtual money.
          </p>
          <button className="sidebar-card-btn">Explore</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p className="topbar-subtitle">
              Welcome, {user?.fullName || "User"} 👋
            </p>
            <h1 className="topbar-title">Dashboard Overview</h1>
          </div>

          <div className="topbar-actions">
            <div className="balance-box">
              <p>Virtual Balance</p>
              <h3>
                {loading
                  ? "Loading..."
                  : `$${cashBalance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
              </h3>
            </div>

            <input
              className="search-box"
              type="text"
              placeholder="Search stocks..."
            />
          </div>
        </header>

        <section className="stats-row">
          <div className="stat-card">
            <p className="stat-label">Portfolio Value</p>
            <h3>
              {loading
                ? "Loading..."
                : `$${portfolioValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </h3>
            <span className="stat-neutral">Live after trades</span>
          </div>

          <div className="stat-card">
            <p className="stat-label">Today's Gain</p>
            <h3>
              {loading
                ? "Loading..."
                : `$${todaysGain.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </h3>
            <span className="stat-neutral">No market move yet</span>
          </div>

          <div className="stat-card">
            <p className="stat-label">Assets Held</p>
            <h3>{loading ? "Loading..." : `${assetsHeld} Stocks`}</h3>
            <span className="stat-neutral">
              {transactions.length} Transactions
            </span>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-center">
            <div className="panel large-panel chart-panel">
              <div className="chart-header">
                <div>
                  <p className="chart-subtitle">Balance</p>
                  <h2>
                    {loading
                      ? "Loading..."
                      : `$${portfolioValue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`}
                  </h2>
                </div>

                <div className="chart-filters">
                  <button className="filter-btn active">1D</button>
                  <button className="filter-btn">1W</button>
                  <button className="filter-btn">1M</button>
                  <button className="filter-btn">3M</button>
                  <button className="filter-btn">1Y</button>
                </div>
              </div>

              <div className="chart-visual">
                <div className="chart-grid-lines"></div>
                <div className="fake-line"></div>
                <div className="chart-point"></div>
              </div>
            </div>

            <div className="bottom-row">
              <div className="panel small-panel">
                <h3>Economic Events</h3>
                <p className="placeholder-text">
                  Real events card will go here
                </p>
              </div>

              <div className="panel small-panel">
                <h3>Markets</h3>
                <p className="placeholder-text">
                  Stock watchlist will go here
                </p>
              </div>
            </div>
          </div>

          <div className="dashboard-right">
            <div className="panel right-panel trade-panel">
              <div className="trade-toggle">
                <button
                  className={`trade-tab ${tradeType === "BUY" ? "active" : ""}`}
                  onClick={() => setTradeType("BUY")}
                >
                  Buy
                </button>
                <button
                  className={`trade-tab ${tradeType === "SELL" ? "active" : ""}`}
                  onClick={() => setTradeType("SELL")}
                >
                  Sell
                </button>
              </div>

              <div className="trade-section">
                <p className="trade-label">Available Balance</p>
                <h4 className="trade-balance">
                  {loading
                    ? "Loading..."
                    : `$${cashBalance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}
                </h4>
              </div>

              <div className="trade-section">
                <label className="trade-label">Stock</label>
                <input
                  className="trade-input"
                  type="text"
                  placeholder="Search stock symbol (e.g. AAPL)"
                  value={stockSymbol}
                  onChange={(e) => setStockSymbol(e.target.value)}
                />
                <p className="trade-hint">
                  Sample symbols: AAPL, TSLA, MSFT, NVDA, AMZN, GOOGL, META
                </p>
              </div>

              <div className="trade-section">
                <label className="trade-label">Current Price</label>
                <div className="trade-static-box">
                  {selectedPrice > 0 ? `$${selectedPrice.toFixed(2)}` : "$0.00"}
                </div>
              </div>

              <div className="trade-section">
                <label className="trade-label">Quantity</label>
                <input
                  className="trade-input"
                  type="number"
                  min="0"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <div className="trade-summary">
                <div className="trade-summary-row">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="trade-summary-row">
                  <span>Fee (0.50%)</span>
                  <span>${fee.toFixed(2)}</span>
                </div>
                <div className="trade-summary-row total">
                  <span>Total</span>
                  <span>${total > 0 ? total.toFixed(2) : "0.00"}</span>
                </div>
              </div>

              <p className="trade-status">{orderMessage}</p>

              <button
                className="trade-submit-btn"
                disabled={!selectedPrice || !parsedQuantity}
              >
                Preview {tradeType} Order
              </button>
            </div>

            <div className="panel right-panel thin">
              <h3>Order Notes</h3>
              <div className="order-notes">
                <p>• Search for a stock by symbol</p>
                <p>• Enter quantity to preview total cost</p>
                <p>• A trading fee will be applied</p>
                <p>• Live prices and backend order execution come next</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;