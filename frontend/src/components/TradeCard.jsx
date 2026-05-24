import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createTradeNotification } from "../utils/tradeNotifications";

const ORDER_TYPES = [
  { value: "MARKET", label: "Market" },
  { value: "LIMIT", label: "Limit" },
  { value: "MOC", label: "Market On Close" },
  { value: "STOP_LIMIT", label: "Stop Limit" },
  { value: "STOP", label: "Stop" },
  { value: "LIT", label: "Lmt-if-Touched" },
  { value: "MIT", label: "Mkt-if-Touched" },
  { value: "TRAILING_STOP_LIMIT", label: "Trailing Stop Lmt" },
  { value: "TRAILING_STOP", label: "Trailing Stop" },
  { value: "TWAP", label: "TWAP" },
  { value: "VWAP", label: "VWAP" },
  { value: "POV", label: "POV" },
];

const SESSIONS = [
  { value: "RTH", label: "Regular Trading Hours" },
  { value: "RTH_PLUS_PRE_POST", label: "RTH + Pre/Post-Mkt" },
  { value: "OVERNIGHT", label: "Overnight Trading" },
  { value: "TWENTY_FOUR_HOUR", label: "24 Hour Trading" },
];

const TIME_IN_FORCE = [
  { value: "DAY", label: "Day" },
  { value: "GTD", label: "GTD" },
  { value: "GTC", label: "GTC" },
];

function TradeCard({ user, portfolioData, cashBalance, onTradeComplete }) {
  const [tradeMode, setTradeMode] = useState("SIMPLE");
  const [tradeType, setTradeType] = useState("BUY");

  const [stockSymbol, setStockSymbol] = useState("");
  const [selectedStock, setSelectedStock] = useState(null);

  const [quantity, setQuantity] = useState("");
  const [amount, setAmount] = useState("");

  const [sessionType, setSessionType] = useState("RTH_PLUS_PRE_POST");
  const [orderType, setOrderType] = useState("MARKET");
  const [timeInForce, setTimeInForce] = useState("DAY");

  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [triggerPrice, setTriggerPrice] = useState("");

  const [takeProfitEnabled, setTakeProfitEnabled] = useState(false);
  const [takeProfitPrice, setTakeProfitPrice] = useState("");

  const [stopLossEnabled, setStopLossEnabled] = useState(false);
  const [stopLossPrice, setStopLossPrice] = useState("");

  const [trailingType, setTrailingType] = useState("PERCENT");
  const [trailingValue, setTrailingValue] = useState("");

  const [gtdDate, setGtdDate] = useState("");

  const [algorithmTotalSlices, setAlgorithmTotalSlices] = useState("5");
  const [algorithmParticipation, setAlgorithmParticipation] = useState("10");

  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [stockPrice, setStockPrice] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);

  const [openOrders, setOpenOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [tradeFeedback, setTradeFeedback] = useState(null);

  const searchBoxRef = useRef(null);
  const userId = user?.id;
  const holdings = useMemo(
    () => portfolioData?.holdings || [],
    [portfolioData?.holdings]
  );

  const ownedStocks = useMemo(
    () =>
      holdings.map((holding) => ({
        symbol: holding.stock_symbol,
        description: `Owned: ${Number(holding.quantity).toFixed(4)} shares`,
      })),
    [holdings]
  );

  const selectedHolding =
    tradeType === "SELL"
      ? holdings.find((h) => h.stock_symbol === selectedStock?.symbol)
      : null;

  const maxSellQuantity = selectedHolding ? Number(selectedHolding.quantity) : 0;

  const parsedQuantity = Number(quantity) || 0;
  const parsedAmount = Number(amount) || 0;

  const estimatedPrice =
    Number(limitPrice) ||
    Number(stopPrice) ||
    Number(triggerPrice) ||
    Number(stockPrice) ||
    0;

  const subtotal =
    parsedAmount > 0 ? parsedAmount : estimatedPrice * parsedQuantity;

  const fee = subtotal * 0.005;
  const total = tradeType === "BUY" ? subtotal + fee : subtotal - fee;
  const orderQuantity =
    parsedQuantity ||
    (stockPrice > 0 && parsedAmount > 0 ? parsedAmount / stockPrice : 0);

  const maxQtyToBuy =
    stockPrice > 0 ? cashBalance / (stockPrice * 1.005) : 0;

  const needsLimitPrice = [
    "LIMIT",
    "STOP_LIMIT",
    "LIT",
    "TRAILING_STOP_LIMIT",
  ].includes(orderType);

  const needsStopPrice = ["STOP", "STOP_LIMIT"].includes(orderType);
  const needsTriggerPrice = ["LIT", "MIT"].includes(orderType);

  const needsTrailing = [
    "TRAILING_STOP",
    "TRAILING_STOP_LIMIT",
  ].includes(orderType);

  const isAlgoOrder = ["TWAP", "VWAP", "POV"].includes(orderType);

  const fetchOpenOrders = useCallback(async () => {
    if (!userId) return;

    try {
      setOrdersLoading(true);
      const response = await fetch(`/api/orders/user/${userId}`);
      const data = await response.json();

      setOpenOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Open orders error:", error);
      setOpenOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const delay = setTimeout(fetchOpenOrders, 0);
    return () => clearTimeout(delay);
  }, [fetchOpenOrders]);

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
  }, [stockSymbol, selectedStock, tradeType, ownedStocks]);

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
    } catch {
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

  const resetTradeForm = ({ clearFeedback = false } = {}) => {
    setStockSymbol("");
    setSelectedStock(null);
    setStockPrice(0);
    setQuantity("");
    setAmount("");
    setSearchResults([]);
    setShowDropdown(false);
    setLimitPrice("");
    setStopPrice("");
    setTriggerPrice("");
    setTakeProfitEnabled(false);
    setTakeProfitPrice("");
    setStopLossEnabled(false);
    setStopLossPrice("");
    setTrailingValue("");
    setGtdDate("");
    setShowConfirmModal(false);

    if (clearFeedback) {
      setTradeFeedback(null);
    }
  };

  const orderMessage = useMemo(() => {
    if (!stockSymbol.trim()) {
      return tradeType === "BUY"
        ? "Search and select a stock symbol."
        : "Select a stock from your holdings.";
    }

    if (!stockPrice) return "Waiting for live stock price.";
    if (!parsedQuantity && !parsedAmount) return "Enter quantity or amount.";

    if (tradeType === "BUY" && tradeMode === "SIMPLE" && total > cashBalance) {
      return "Insufficient balance for this order.";
    }

    if (tradeType === "SELL" && parsedQuantity > maxSellQuantity) {
      return `You only own ${maxSellQuantity.toFixed(4)} shares.`;
    }

    if (tradeMode === "ADVANCED" && orderType !== "MARKET") {
      return `${orderType.replaceAll("_", " ")} order will be saved as an open order.`;
    }

    return `${tradeType} order preview ready.`;
  }, [
    stockSymbol,
    stockPrice,
    parsedQuantity,
    parsedAmount,
    tradeType,
    tradeMode,
    total,
    cashBalance,
    maxSellQuantity,
    orderType,
  ]);

  const validateOrder = () => {
    if (!selectedStock || !selectedStock.symbol) {
      return "Please select a stock before previewing this order.";
    }

    if (!stockPrice || stockPrice <= 0) {
      return "Waiting for a valid live stock price.";
    }

    if (!orderQuantity || orderQuantity <= 0) {
      return "Enter a quantity or dollar amount greater than zero.";
    }

    if (
      tradeType === "BUY" &&
      tradeMode === "SIMPLE" &&
      total > Number(cashBalance || 0)
    ) {
      return "Insufficient balance for this order.";
    }

    if (tradeType === "SELL" && orderQuantity > maxSellQuantity) {
      return `You only own ${maxSellQuantity.toFixed(4)} shares.`;
    }

    return "";
  };

  const handlePreviewOrder = () => {
    const validationError = validateOrder();

    if (validationError) {
      setTradeFeedback({ type: "error", message: validationError });
      setShowConfirmModal(false);
      return;
    }

    setTradeFeedback(null);
    setShowConfirmModal(true);
  };

  const handleConfirmOrder = async () => {
    const validationError = validateOrder();

    if (validationError) {
      setTradeFeedback({ type: "error", message: validationError });
      setShowConfirmModal(false);
      return;
    }

    setOrderSubmitting(true);
    setTradeFeedback(null);

    try {
      if (tradeMode === "SIMPLE") {
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
            quantity: Number(orderQuantity),
            pricePerShare: Number(stockPrice),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setTradeFeedback({ type: "error", message: data.message || `${tradeType} failed` });
          return;
        }

        createTradeNotification({
          userId: user.id,
  type: "FILLED",
  mode: "SIMPLE",
  side: tradeType,
  symbol: selectedStock.symbol,
  quantity: Number(orderQuantity),
  price: Number(stockPrice),
  total,
  orderType: "MARKET",
});

        resetTradeForm();
        setTradeFeedback({
          type: "success",
          message:
            tradeType === "BUY"
              ? "Stock purchased successfully."
              : "Stock sold successfully.",
        });
        onTradeComplete?.();
        fetchOpenOrders();
        return;
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          stockSymbol: selectedStock.symbol,
          side: tradeType,
          sessionType,
          orderType,
          timeInForce,
          quantity: Number(orderQuantity),

          limitPrice: limitPrice ? Number(limitPrice) : null,
          stopPrice: stopPrice ? Number(stopPrice) : null,
          triggerPrice: triggerPrice ? Number(triggerPrice) : null,

          takeProfitPrice:
            takeProfitEnabled && takeProfitPrice
              ? Number(takeProfitPrice)
              : null,

          stopLossPrice:
            stopLossEnabled && stopLossPrice ? Number(stopLossPrice) : null,

          trailingType: needsTrailing ? trailingType : null,
          trailingValue:
            needsTrailing && trailingValue ? Number(trailingValue) : null,

          gtdDate: timeInForce === "GTD" ? gtdDate : null,

          algorithmTotalSlices: isAlgoOrder
            ? Number(algorithmTotalSlices) || 5
            : 1,

          algorithmParticipation:
            orderType === "POV" ? Number(algorithmParticipation) || 10 : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setTradeFeedback({ type: "error", message: data.message || "Advanced order failed" });
        return;
      }

      if (data.order?.status === "FILLED") {
  createTradeNotification({
    userId: user.id,
    type: "FILLED",
    mode: "ADVANCED",
    orderId: data.order.id,
    side: data.order.side,
    symbol: data.order.stock_symbol,
    quantity: Number(data.order.filled_quantity || data.order.quantity),
    price: Number(data.order.filled_price || stockPrice),
    orderType: data.order.order_type || orderType,
    createdAt: data.order.filled_at || data.order.updated_at,
  });
} else {
  createTradeNotification({
    userId: user.id,
    type: "SUBMITTED",
    mode: "ADVANCED",
    orderId: data.order?.id,
    side: tradeType,
    symbol: selectedStock.symbol,
    quantity: Number(orderQuantity),
    price: Number(limitPrice || stopPrice || triggerPrice || stockPrice),
    orderType,
  });
}

      resetTradeForm();
      setTradeFeedback({
        type: "success",
        message:
          data.order?.status === "FILLED"
            ? `${tradeType} order filled successfully.`
            : `${tradeType} order submitted successfully.`,
      });
      onTradeComplete?.();
      fetchOpenOrders();
    } catch (error) {
      console.error(error);
      setTradeFeedback({ type: "error", message: "Could not connect to server." });
    } finally {
      setOrderSubmitting(false);
    }
  };

  const cancelOrder = async (orderId) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setTradeFeedback({ type: "error", message: data.message || "Cancel failed" });
        return;
      }

      setTradeFeedback({ type: "success", message: "Order cancelled successfully." });
      fetchOpenOrders();
    } catch {
      setTradeFeedback({ type: "error", message: "Could not cancel order." });
    }
  };

  return (
    <div className="panel right-panel trade-panel">
      <div className="trade-mode-toggle">
        <button
          className={tradeMode === "SIMPLE" ? "active" : ""}
          onClick={() => {
            setTradeMode("SIMPLE");
            setTradeFeedback(null);
          }}
        >
          Simple
        </button>

        <button
          className={tradeMode === "ADVANCED" ? "active" : ""}
          onClick={() => {
            setTradeMode("ADVANCED");
            setTradeFeedback(null);
          }}
        >
          Advanced
        </button>
      </div>

      <div className="trade-toggle">
        <button
          className={`trade-tab ${tradeType === "BUY" ? "active" : ""}`}
          onClick={() => {
            setTradeType("BUY");
            resetTradeForm({ clearFeedback: true });
          }}
        >
          Buy
        </button>

        <button
          className={`trade-tab ${tradeType === "SELL" ? "active" : ""}`}
          onClick={() => {
            setTradeType("SELL");
            resetTradeForm({ clearFeedback: true });
          }}
        >
          Sell
        </button>
      </div>

      <div className="trade-section">
        <p className="trade-label">Available Balance</p>
        <h4 className="trade-balance">
          ${Number(cashBalance || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </h4>
      </div>

      <div className="trade-section trade-search-wrapper" ref={searchBoxRef}>
        <label className="trade-label">
          {tradeType === "BUY" ? "Symbol" : "Your Holdings"}
        </label>

        <input
          className="trade-input"
          type="text"
          placeholder={
            tradeType === "BUY"
              ? "Search stock symbol, e.g. AAPL"
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

      <div className="trade-price-strip">
        <span>Live Price</span>
        <strong>
          {priceLoading
            ? "Loading..."
            : stockPrice > 0
            ? `$${stockPrice.toFixed(2)}`
            : "$0.00"}
        </strong>
      </div>

      {tradeMode === "ADVANCED" && (
        <>
          <div className="trade-section">
            <label className="trade-label">Session</label>
            <select
              className="trade-input trade-select"
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
            >
              {SESSIONS.map((session) => (
                <option key={session.value} value={session.value}>
                  {session.label}
                </option>
              ))}
            </select>
          </div>

          <div className="trade-section">
            <label className="trade-label">Order Type</label>
            <select
              className="trade-input trade-select"
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
            >
              {ORDER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {needsLimitPrice && (
            <div className="trade-section">
              <label className="trade-label">Limit Price</label>
              <input
                className="trade-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter limit price"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
              />
            </div>
          )}

          {needsStopPrice && (
            <div className="trade-section">
              <label className="trade-label">Stop Price</label>
              <input
                className="trade-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter stop price"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
              />
            </div>
          )}

          {needsTriggerPrice && (
            <div className="trade-section">
              <label className="trade-label">Trigger Price</label>
              <input
                className="trade-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter trigger price"
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(e.target.value)}
              />
            </div>
          )}

          {needsTrailing && (
            <div className="trade-row-2">
              <div className="trade-section">
                <label className="trade-label">Trailing Type</label>
                <select
                  className="trade-input trade-select"
                  value={trailingType}
                  onChange={(e) => setTrailingType(e.target.value)}
                >
                  <option value="PERCENT">Percent</option>
                  <option value="AMOUNT">Amount</option>
                </select>
              </div>

              <div className="trade-section">
                <label className="trade-label">Trail Value</label>
                <input
                  className="trade-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={trailingType === "PERCENT" ? "5%" : "$5"}
                  value={trailingValue}
                  onChange={(e) => setTrailingValue(e.target.value)}
                />
              </div>
            </div>
          )}

          {isAlgoOrder && (
            <div className="trade-row-2">
              <div className="trade-section">
                <label className="trade-label">Slices</label>
                <input
                  className="trade-input"
                  type="number"
                  min="1"
                  step="1"
                  value={algorithmTotalSlices}
                  onChange={(e) => setAlgorithmTotalSlices(e.target.value)}
                />
              </div>

              {orderType === "POV" && (
                <div className="trade-section">
                  <label className="trade-label">Participation %</label>
                  <input
                    className="trade-input"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={algorithmParticipation}
                    onChange={(e) =>
                      setAlgorithmParticipation(e.target.value)
                    }
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

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

      {tradeMode === "ADVANCED" && (
        <>
          <div className="trade-section">
            <label className="trade-label">Time-in-Force</label>
            <select
              className="trade-input trade-select"
              value={timeInForce}
              onChange={(e) => setTimeInForce(e.target.value)}
            >
              {TIME_IN_FORCE.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {timeInForce === "GTD" && (
            <div className="trade-section">
              <label className="trade-label">Good Till Date</label>
              <input
                className="trade-input"
                type="datetime-local"
                value={gtdDate}
                onChange={(e) => setGtdDate(e.target.value)}
              />
            </div>
          )}

          {tradeType === "BUY" && (
            <div className="risk-controls">
              <label className="risk-check">
                <input
                  type="checkbox"
                  checked={takeProfitEnabled}
                  onChange={(e) => setTakeProfitEnabled(e.target.checked)}
                />
                Take Profit
              </label>

              <label className="risk-check">
                <input
                  type="checkbox"
                  checked={stopLossEnabled}
                  onChange={(e) => setStopLossEnabled(e.target.checked)}
                />
                Stop Loss
              </label>
            </div>
          )}

          {tradeType === "BUY" && takeProfitEnabled && (
            <div className="trade-section">
              <label className="trade-label">Take Profit Price</label>
              <input
                className="trade-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Example: 320.00"
                value={takeProfitPrice}
                onChange={(e) => setTakeProfitPrice(e.target.value)}
              />
            </div>
          )}

          {tradeType === "BUY" && stopLossEnabled && (
            <div className="trade-section">
              <label className="trade-label">Stop Loss Price</label>
              <input
                className="trade-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Example: 280.00"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
              />
            </div>
          )}
        </>
      )}

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
          <span>{tradeType === "BUY" ? "Total Cost" : "Estimated Receive"}</span>
          <span>${total > 0 ? total.toFixed(2) : "0.00"}</span>
        </div>
      </div>

      <div className="trade-limits">
        <p>
          Max Qty to Buy Cash{" "}
          <span>{maxQtyToBuy > 0 ? maxQtyToBuy.toFixed(4) : "0"}</span>
        </p>

        <p>
          Max Qty to Sell{" "}
          <span>{maxSellQuantity > 0 ? maxSellQuantity.toFixed(4) : "0"}</span>
        </p>
      </div>

      <p className="trade-status">{orderMessage}</p>

      {tradeFeedback && !showConfirmModal && (
        <p className={`trade-message ${tradeFeedback.type}`}>
          {tradeFeedback.message}
        </p>
      )}

      <button
        className="trade-submit-btn"
        disabled={orderSubmitting || !stockPrice || (!parsedQuantity && !parsedAmount)}
        onClick={tradeMode === "SIMPLE" ? handlePreviewOrder : handleConfirmOrder}
      >
        {orderSubmitting
          ? "Submitting..."
          : tradeMode === "SIMPLE"
          ? `Preview ${tradeType} Order`
          : `Submit ${orderType.replaceAll("_", " ")} Order`}
      </button>

      {tradeMode === "ADVANCED" && (
        <div className="open-orders-mini">
          <div className="open-orders-mini-head">
            <h4>Open Orders</h4>
            <button onClick={fetchOpenOrders}>Refresh</button>
          </div>

          {ordersLoading ? (
            <p className="trade-hint">Loading orders...</p>
          ) : openOrders.filter((order) => order.status === "PENDING").length ===
            0 ? (
            <p className="trade-hint">No pending orders.</p>
          ) : (
            openOrders
              .filter((order) => order.status === "PENDING")
              .slice(0, 5)
              .map((order) => (
                <div className="open-order-mini-row" key={order.id}>
                  <div>
                    <strong>
                      {order.side} {order.stock_symbol}
                    </strong>
                    <p>
                      {order.order_type.replaceAll("_", " ")} • Qty{" "}
                      {Number(order.remaining_quantity).toFixed(4)}
                    </p>
                  </div>

                  <button onClick={() => cancelOrder(order.id)}>Cancel</button>
                </div>
              ))
          )}
        </div>
      )}

      {showConfirmModal && (
        <div
          className="trade-confirm-overlay"
          role="presentation"
          onClick={() => {
            if (!orderSubmitting) {
              setShowConfirmModal(false);
              setTradeFeedback(null);
            }
          }}
        >
          <div
            className="trade-confirm-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trade-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="trade-confirm-kicker">Order Preview</p>
            <h3 id="trade-confirm-title">Confirm {tradeType} Order</h3>

            <div className="trade-confirm-summary">
              <div className="trade-confirm-row">
                <span>Symbol</span>
                <strong>{selectedStock?.symbol}</strong>
              </div>

              <div className="trade-confirm-row">
                <span>Quantity</span>
                <strong>{orderQuantity.toFixed(4)}</strong>
              </div>

              <div className="trade-confirm-row">
                <span>Current Price</span>
                <strong>${stockPrice.toFixed(2)}</strong>
              </div>

              <div className="trade-confirm-row">
                <span>Subtotal</span>
                <strong>${subtotal.toFixed(2)}</strong>
              </div>

              <div className="trade-confirm-row">
                <span>Fee</span>
                <strong>${fee.toFixed(2)}</strong>
              </div>

              <div className="trade-confirm-row total">
                <span>
                  {tradeType === "BUY" ? "Total Cost" : "Estimated Receive"}
                </span>
                <strong>${total > 0 ? total.toFixed(2) : "0.00"}</strong>
              </div>
            </div>

            {tradeFeedback && (
              <p className={`trade-message ${tradeFeedback.type}`} aria-live="polite">
                {tradeFeedback.message}
              </p>
            )}

            <div className="trade-confirm-actions">
              <button
                className="trade-confirm-cancel"
                type="button"
                disabled={orderSubmitting}
                onClick={() => {
                  setShowConfirmModal(false);
                  setTradeFeedback(null);
                }}
              >
                Cancel
              </button>

              <button
                className="trade-confirm-primary"
                type="button"
                disabled={orderSubmitting}
                onClick={handleConfirmOrder}
              >
                {orderSubmitting ? "Confirming..." : `Confirm ${tradeType}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TradeCard;
