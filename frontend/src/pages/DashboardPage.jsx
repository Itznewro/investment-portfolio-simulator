import "../App.css";
import logo from "../assets/logo.png";
import { useEffect, useState } from "react";

function DashboardPage() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // For now, portfolio value = cash balance because no live holdings value yet
  const portfolioValue = cashBalance;

  // For now, today's gain = 0 until stock price tracking is added
  const todaysGain = 0;

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
                {loading ? "Loading..." : `$${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
    <button className="trade-tab active">Buy</button>
    <button className="trade-tab">Sell</button>
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
    />
  </div>

  <div className="trade-section">
    <label className="trade-label">Current Price</label>
    <div className="trade-static-box">$0.00</div>
  </div>

  <div className="trade-section">
    <label className="trade-label">Quantity</label>
    <input
      className="trade-input"
      type="number"
      placeholder="Enter quantity"
    />
  </div>

  <div className="trade-summary">
    <div className="trade-summary-row">
      <span>Fee (0.50%)</span>
      <span>$0.00</span>
    </div>
    <div className="trade-summary-row total">
      <span>Total</span>
      <span>$0.00</span>
    </div>
  </div>

  <button className="trade-submit-btn">Preview Buy Order</button>
</div>

            <div className="panel right-panel thin">
  <h3>Order Notes</h3>
  <div className="order-notes">
    <p>• Search for a stock by symbol</p>
    <p>• Enter quantity to preview total cost</p>
    <p>• A trading fee will be applied</p>
    <p>• Buy and Sell logic will be connected next</p>
  </div>
</div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;