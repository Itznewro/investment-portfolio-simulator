import "../App.css";
import logo from "../assets/logo.png";
import { useEffect, useMemo, useRef, useState } from "react";

function DashboardPage() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [tradeType, setTradeType] = useState("BUY");
  const [stockSymbol, setStockSymbol] = useState("");
  const [selectedStock, setSelectedStock] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [amount, setAmount] = useState("");

  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [stockPrice, setStockPrice] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);

  const searchBoxRef = useRef(null);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const holdings = portfolioData?.holdings || [];
  const ownedStocks = holdings.map((holding) => ({
    symbol: holding.stock_symbol,
    description: `Owned: ${Number(holding.quantity).toFixed(4)} shares`,
    ownedQuantity: Number(holding.quantity),
  }));

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!stockSymbol.trim()) {
        setSearchResults([]);
        return;
      }

      if (tradeType === "SELL") {
        const filteredHoldings = ownedStocks.filter((item) =>
          item.symbol.toLowerCase().includes(stockSymbol.toLowerCase())
        );
        setSearchResults(filteredHoldings);
        setShowDropdown(true);
        return;
      }

      if (selectedStock?.symbol === stockSymbol.trim().toUpperCase()) {
        setSearchResults([]);
        return;
      }

      try {
        setSearchLoading(true);
        const response = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(stockSymbol)}`
        );
        const data = await response.json();

        const filtered = Array.isArray(data)
          ? data.filter((item) => item.symbol && item.description)
          : [];

        setSearchResults(filtered);
        setShowDropdown(true);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const delay = setTimeout(() => {
      fetchSearchResults();
    }, 300);

    return () => clearTimeout(delay);
  }, [stockSymbol, selectedStock, tradeType, portfolioData]);

  const fetchQuote = async (symbol) => {
    try {
      setPriceLoading(true);
      const response = await fetch(`/api/stocks/quote/${symbol}`);
      const data = await response.json();

      const livePrice = Number(data.c) || 0;
      setStockPrice(livePrice);

      if (quantity) {
        const recalculatedAmount = Number(quantity) * livePrice;
        setAmount(recalculatedAmount > 0 ? recalculatedAmount.toFixed(2) : "");
      } else if (amount) {
        const recalculatedQuantity = Number(amount) / livePrice;
        setQuantity(
          recalculatedQuantity > 0 ? recalculatedQuantity.toFixed(4) : ""
        );
      }
    } catch (error) {
      console.error("Quote error:", error);
      setStockPrice(0);
    } finally {
      setPriceLoading(false);
    }
  };

  const handleSelectStock = (stock) => {
    setSelectedStock(stock);
    setStockSymbol(stock.symbol);
    setShowDropdown(false);
    fetchQuote(stock.symbol);
  };

  const cashBalance = portfolioData?.portfolio?.cashBalance
    ? Number(portfolioData.portfolio.cashBalance)
    : 0;

  const transactions = portfolioData?.transactions || [];
  const assetsHeld = holdings.length;
  const portfolioValue = cashBalance;
  const todaysGain = 0;

  const parsedQuantity = Number(quantity) || 0;
  const parsedAmount = Number(amount) || 0;

  const subtotal = parsedAmount > 0 ? parsedAmount : stockPrice * parsedQuantity;
  const fee = subtotal * 0.005;
  const total = tradeType === "BUY" ? subtotal + fee : subtotal - fee;

  const selectedHolding =
    tradeType === "SELL"
      ? holdings.find((h) => h.stock_symbol === selectedStock?.symbol)
      : null;

  const maxSellQuantity = selectedHolding
    ? Number(selectedHolding.quantity)
    : 0;

  const orderMessage = useMemo(() => {
    if (!stockSymbol.trim()) {
      return tradeType === "BUY"
        ? "Search and select a stock symbol."
        : "Select a stock from your holdings.";
    }
    if (!stockPrice) return "Waiting for live stock price.";
    if (!parsedQuantity && !parsedAmount)
      return "Enter quantity or amount to preview the order.";
    if (tradeType === "BUY" && total > cashBalance) {
      return "Insufficient balance for this order.";
    }
    if (tradeType === "SELL" && parsedQuantity > maxSellQuantity) {
      return `You only own ${maxSellQuantity.toFixed(4)} shares.`;
    }
    return `${tradeType} order preview ready.`;
  }, [
    stockSymbol,
    stockPrice,
    parsedQuantity,
    parsedAmount,
    tradeType,
    total,
    cashBalance,
    maxSellQuantity,
  ]);

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    setQuantity(value);

    const numericValue = Number(value);
    if (!value || numericValue <= 0 || !stockPrice) {
      setAmount("");
      return;
    }

    const calculatedAmount = numericValue * stockPrice;
    setAmount(calculatedAmount.toFixed(2));
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmount(value);

    const numericValue = Number(value);
    if (!value || numericValue <= 0 || !stockPrice) {
      setQuantity("");
      return;
    }

    const calculatedQuantity = numericValue / stockPrice;
    setQuantity(calculatedQuantity.toFixed(4));
  };

  const handlePreviewOrder = async () => {
    if (!selectedStock || !stockPrice || (!quantity && !amount)) {
      alert("Please select a stock and enter quantity or amount.");
      return;
    }

    if (tradeType === "SELL" && Number(quantity) > maxSellQuantity) {
      alert(`You only own ${maxSellQuantity.toFixed(4)} shares.`);
      return;
    }

    try {
      const endpoint =
        tradeType === "BUY" ? "/api/trade/buy" : "/api/trade/sell";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          stockSymbol: selectedStock.symbol,
          quantity: Number(quantity),
          pricePerShare: Number(stockPrice),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || `${tradeType} failed`);
        return;
      }

      alert(
        tradeType === "BUY"
          ? "Stock purchased successfully!"
          : "Stock sold successfully!"
      );

      const refreshed = await fetch(`/api/portfolio/${user.id}`);
      const refreshedData = await refreshed.json();
      setPortfolioData(refreshedData);

      setStockSymbol("");
      setSelectedStock(null);
      setStockPrice(0);
      setQuantity("");
      setAmount("");
      setSearchResults([]);
      setShowDropdown(false);
    } catch (error) {
      console.error(error);
      alert("Could not connect to server.");
    }
  };

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
                  onClick={() => {
                    setTradeType("BUY");
                    setStockSymbol("");
                    setSelectedStock(null);
                    setStockPrice(0);
                    setQuantity("");
                    setAmount("");
                    setSearchResults([]);
                    setShowDropdown(false);
                  }}
                >
                  Buy
                </button>
                <button
                  className={`trade-tab ${tradeType === "SELL" ? "active" : ""}`}
                  onClick={() => {
                    setTradeType("SELL");
                    setStockSymbol("");
                    setSelectedStock(null);
                    setStockPrice(0);
                    setQuantity("");
                    setAmount("");
                    setSearchResults([]);
                    setShowDropdown(false);
                  }}
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

              <div className="trade-section trade-search-wrapper" ref={searchBoxRef}>
                <label className="trade-label">
                  {tradeType === "BUY" ? "Stock" : "Your Holdings"}
                </label>
                <input
                  className="trade-input"
                  type="text"
                  placeholder={
                    tradeType === "BUY"
                      ? "Search stock symbol (e.g. AAPL)"
                      : "Search your owned stocks"
                  }
                  value={stockSymbol}
                  onChange={(e) => {
                    setStockSymbol(e.target.value);
                    setSelectedStock(null);
                    setStockPrice(0);
                  }}
                  onFocus={() => {
                    if (tradeType === "SELL") {
                      setSearchResults(ownedStocks);
                      setShowDropdown(true);
                    } else if (searchResults.length > 0) {
                      setShowDropdown(true);
                    }
                  }}
                />

                {searchLoading && tradeType === "BUY" && (
                  <p className="trade-hint">Searching stocks...</p>
                )}

                {!searchLoading && selectedStock && (
                  <p className="trade-hint">
                    Selected: {selectedStock.symbol} - {selectedStock.description}
                  </p>
                )}

                {tradeType === "SELL" && selectedHolding && (
                  <p className="trade-hint">
                    You own {maxSellQuantity.toFixed(4)} shares
                  </p>
                )}

                {showDropdown && searchResults.length > 0 && (
                  <div className="stock-dropdown">
                    {searchResults.map((stock, index) => (
                      <button
                        key={`${stock.symbol}-${index}`}
                        className="stock-dropdown-item"
                        onClick={() => handleSelectStock(stock)}
                      >
                        <span className="stock-symbol">{stock.symbol}</span>
                        <span className="stock-description">
                          {stock.description}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="trade-section">
                <label className="trade-label">Current Price</label>
                <div className="trade-static-box">
                  {priceLoading
                    ? "Loading..."
                    : stockPrice > 0
                    ? `$${stockPrice.toFixed(2)}`
                    : "$0.00"}
                </div>
              </div>

              <div className="trade-section">
                <label className="trade-label">Quantity</label>
                <input
                  className="trade-input"
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={handleQuantityChange}
                />
              </div>

              <div className="trade-section">
                <label className="trade-label">Amount</label>
                <input
                  className="trade-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter amount in dollars"
                  value={amount}
                  onChange={handleAmountChange}
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
                disabled={!stockPrice || (!parsedQuantity && !parsedAmount)}
                onClick={handlePreviewOrder}
              >
                Preview {tradeType} Order
              </button>
            </div>

            <div className="panel right-panel thin">
              <h3>Order Notes</h3>
              <div className="order-notes">
                <p>• Search for a stock by symbol</p>
                <p>• In Sell mode, only your owned stocks appear</p>
                <p>• Enter quantity or amount to preview order value</p>
                <p>• A trading fee will be applied</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;