import "../App.css";
import logo from "../assets/logo.png";

function DashboardPage() {
  const user = JSON.parse(localStorage.getItem("user"));

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
              <h3>$100,000</h3>
            </div>

            <input
              className="search-box"
              type="text"
              placeholder="Search stocks..."
            />
          </div>
        </header>

        <section className="dashboard-grid">
          <div className="dashboard-center">
            <div className="panel large-panel">
              <h3>Balance Chart</h3>
              <p className="placeholder-text">
                Main portfolio chart will go here
              </p>
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
            <div className="panel right-panel thin">
              <h3>Trade Calculator</h3>
              <p className="placeholder-text">
                Buy / sell calculator will go here
              </p>
            </div>

            <div className="panel right-panel thin">
              <h3>Market Hours</h3>
              <p className="placeholder-text">
                Market hours widget will go here
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;