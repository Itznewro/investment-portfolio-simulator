import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, CalendarDays, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import logo from "../assets/logo.png";
import Topbar from "../components/Topbar";
import "../App.css";

function HistoryPage() {
  const user = JSON.parse(localStorage.getItem("user"));
  

  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState("ALL");
  const [logos, setLogos] = useState({});
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const itemsPerPage = 6;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/portfolio/${user.id}`);
        const data = await response.json();
        setTransactions(data.transactions || []);
      } catch (error) {
        console.error("History fetch error:", error);
      }
    };

    if (user?.id) fetchHistory();
  }, [user?.id]);

  useEffect(() => {
  const fetchLogos = async () => {
    const uniqueSymbols = [...new Set(transactions.map(t => t.stock_symbol))];

    const logoMap = {};

    for (const symbol of uniqueSymbols) {
      try {
        const res = await fetch(`/api/stocks/profile/${symbol}`);
        const data = await res.json();
        logoMap[symbol] = data.logo;
      } catch {
        logoMap[symbol] = null;
      }
    }

    setLogos(logoMap);
  };

  if (transactions.length) fetchLogos();
}, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((trade) => {
      const tradeType = trade.transaction_type?.toUpperCase();
      const symbol = trade.stock_symbol?.toLowerCase();
      const tradeDate = new Date(trade.created_at);

      const matchesType =
        filterType === "ALL" || tradeType === filterType;

      const matchesSearch =
        symbol.includes(search.toLowerCase()) ||
        tradeType.includes(search.toUpperCase());

      const matchesFrom =
        !dateFrom || tradeDate >= new Date(dateFrom);

      const matchesTo =
        !dateTo || tradeDate <= new Date(`${dateTo}T23:59:59`);

      return matchesType && matchesSearch && matchesFrom && matchesTo;
    });
  }, [transactions, filterType, search, dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;

  const paginatedTransactions = filteredTransactions.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const resetFilters = () => {
    setFilterType("ALL");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

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
           <a className="nav-item" href="/trade">Market</a>
            <Link className="nav-item active" to="/history">Transactions</Link>
            <a className="nav-item" href="/settings">Settings</a>
          </nav>
        </div>

        <div className="sidebar-card">
          <p className="sidebar-card-title">Trade History</p>
          <p className="sidebar-card-text">
            Review your buy and sell transactions.
          </p>
          <button className="sidebar-card-btn">Explore</button>
        </div>
      </aside>

      <main className="main-content">
        <Topbar />

        <section className="history-header">
          <div>
            <h1>Trade History</h1>
            <p>View your trades and transaction records.</p>
          </div>
        </section>

        <section className="history-card">
          <div className="history-tabs">
            <button
              className={filterType === "ALL" ? "active" : ""}
              onClick={() => {
                setFilterType("ALL");
                setPage(1);
              }}
            >
              All trades
            </button>

            <button
              className={filterType === "BUY" ? "active" : ""}
              onClick={() => {
                setFilterType("BUY");
                setPage(1);
              }}
            >
              Buy side
            </button>

            <button
              className={filterType === "SELL" ? "active" : ""}
              onClick={() => {
                setFilterType("SELL");
                setPage(1);
              }}
            >
              Sell side
            </button>
          </div>

          <div className="history-tools">
            <div className="history-search">
              <Search size={17} />
              <input
                placeholder="Search for trades"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <button
              className="history-tool-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              <CalendarDays size={16} />
              Date
            </button>

            <button
              className="history-tool-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="history-filter-panel">
              <label>
                From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </label>

              <label>
                To
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                />
              </label>

              <button onClick={resetFilters}>Reset</button>
            </div>
          )}

          <div className="history-table">
            <div className="history-table-head">
              <span>Trade</span>
              <span>Order amount</span>
              <span>Trade date</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            {paginatedTransactions.length === 0 ? (
              <p className="history-empty">No trades found.</p>
            ) : (
              paginatedTransactions.map((trade) => {
                const isBuy = trade.transaction_type === "BUY";
                const status = isBuy ? "Completed Buy" : "Completed Sell";

                return (
                  <div className="history-row" key={trade.id}>
                    <div className="history-trade-cell">
                     {logos[trade.stock_symbol] ? (
  <img
    src={logos[trade.stock_symbol]}
    alt={trade.stock_symbol}
    className="stock-logo"
  />
) : (
  <div className="trade-badge">
    {trade.stock_symbol.charAt(0)}
  </div>
)}

                      <div>
                        <Link to={`/stocks/${trade.stock_symbol}`} className="history-stock-link">
                          {trade.stock_symbol} {trade.transaction_type}
                        </Link>
                        <p>Qty: {Number(trade.quantity).toFixed(4)}</p>
                      </div>
                    </div>

                    <div>
                      <strong>
                        ${Number(trade.total_amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </strong>
                      <p>${Number(trade.price_per_share).toFixed(2)} / share</p>
                    </div>

                    <div>
                      <strong>
                        {new Date(trade.created_at).toLocaleDateString()}
                      </strong>
                      <p>{new Date(trade.created_at).toLocaleTimeString()}</p>
                    </div>

                    <div>
                      <span className={isBuy ? "status-pill buy" : "status-pill sell"}>
                        {status}
                      </span>
                    </div>

                    <div>
                      <Link to={`/stocks/${trade.stock_symbol}`} className="history-view-link">
                        View
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="history-pagination">
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <div className="page-numbers">
              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  key={index + 1}
                  className={page === index + 1 ? "active" : ""}
                  onClick={() => setPage(index + 1)}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default HistoryPage;