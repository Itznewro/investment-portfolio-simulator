import { useMemo, useRef, useState, useEffect } from "react";

function TradeCard({ user, portfolioData, cashBalance, onTradeComplete }) {
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
  const holdings = portfolioData?.holdings || [];

  const ownedStocks = holdings.map((holding) => ({
    symbol: holding.stock_symbol,
    description: `Owned: ${Number(holding.quantity).toFixed(4)} shares`,
  }));

  const selectedHolding =
    tradeType === "SELL"
      ? holdings.find((h) => h.stock_symbol === selectedStock?.symbol)
      : null;

  const maxSellQuantity = selectedHolding ? Number(selectedHolding.quantity) : 0;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!stockSymbol.trim()) {
        setSearchResults([]);
        return;
      }

      if (tradeType === "SELL") {
        const filtered = ownedStocks.filter((item) =>
          item.symbol.toLowerCase().includes(stockSymbol.toLowerCase())
        );
        setSearchResults(filtered);
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

        setSearchResults(Array.isArray(data) ? data : []);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const delay = setTimeout(fetchSearchResults, 300);
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
        setAmount((Number(quantity) * livePrice).toFixed(2));
      } else if (amount) {
        setQuantity((Number(amount) / livePrice).toFixed(4));
      }
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

  const parsedQuantity = Number(quantity) || 0;
  const parsedAmount = Number(amount) || 0;
  const subtotal = parsedAmount > 0 ? parsedAmount : stockPrice * parsedQuantity;
  const fee = subtotal * 0.005;
  const total = tradeType === "BUY" ? subtotal + fee : subtotal - fee;

  const orderMessage = useMemo(() => {
    if (!stockSymbol.trim()) {
      return tradeType === "BUY"
        ? "Search and select a stock symbol."
        : "Select a stock from your holdings.";
    }

    if (!stockPrice) return "Waiting for live stock price.";
    if (!parsedQuantity && !parsedAmount) return "Enter quantity or amount.";

    if (tradeType === "BUY" && total > cashBalance) {
      return "Insufficient balance for this order.";
    }

    if (tradeType === "SELL" && parsedQuantity > maxSellQuantity) {
      return `You only own ${maxSellQuantity.toFixed(4)} shares.`;
    }

    return `${tradeType} order preview ready.`;
  }, [stockSymbol, stockPrice, parsedQuantity, parsedAmount, tradeType, total, cashBalance, maxSellQuantity]);

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    setQuantity(value);

    if (!value || !stockPrice) {
      setAmount("");
      return;
    }

    setAmount((Number(value) * stockPrice).toFixed(2));
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmount(value);

    if (!value || !stockPrice) {
      setQuantity("");
      return;
    }

    setQuantity((Number(value) / stockPrice).toFixed(4));
  };

  const resetTradeForm = () => {
    setStockSymbol("");
    setSelectedStock(null);
    setStockPrice(0);
    setQuantity("");
    setAmount("");
    setSearchResults([]);
    setShowDropdown(false);
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

    const endpoint = tradeType === "BUY" ? "/api/trade/buy" : "/api/trade/sell";

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

    alert(tradeType === "BUY" ? "Stock purchased successfully!" : "Stock sold successfully!");

    resetTradeForm();

    if (onTradeComplete) {
      onTradeComplete();
    }
  };

  return (
    <div className="panel right-panel trade-panel">
      <div className="trade-toggle">
        <button
          className={`trade-tab ${tradeType === "BUY" ? "active" : ""}`}
          onClick={() => {
            setTradeType("BUY");
            resetTradeForm();
          }}
        >
          Buy
        </button>

        <button
          className={`trade-tab ${tradeType === "SELL" ? "active" : ""}`}
          onClick={() => {
            setTradeType("SELL");
            resetTradeForm();
          }}
        >
          Sell
        </button>
      </div>

      <div className="trade-section">
        <p className="trade-label">Available Balance</p>
        <h4 className="trade-balance">
          ${cashBalance.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
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

        {selectedStock && (
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
                <span className="stock-description">{stock.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="trade-section">
        <label className="trade-label">Current Price</label>
        <div className="trade-static-box">
          {priceLoading ? "Loading..." : stockPrice > 0 ? `$${stockPrice.toFixed(2)}` : "$0.00"}
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
  );
}

export default TradeCard;