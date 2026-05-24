import {
  Search,
  Settings,
  Bell,
  X,
  CheckCircle2,
  CandlestickChart,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createTradeNotification,
  getTradeNotifications,
  markAllNotificationsRead,
  wasOrderNotified,
} from "../utils/tradeNotifications";

const defaultTopSymbols = [
  "NVDA",
  "TSLA",
  "AAPL",
  "MSFT",
  "AMZN",
  "META",
  "GOOGL",
  "NFLX",
];

function Topbar() {
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;
  const navigate = useNavigate();

  const searchRef = useRef(null);
  const notificationRef = useRef(null);

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [topLoading, setTopLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [topStocks, setTopStocks] = useState([]);
  const [profileImage, setProfileImage] = useState(
    localStorage.getItem("profileImage")
  );

  const [notifications, setNotifications] = useState(() =>
    getTradeNotifications(userId)
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeToast, setActiveToast] = useState(null);

  useEffect(() => {
    queueMicrotask(() => {
      setNotifications(getTradeNotifications(userId));
      setNotificationsOpen(false);
      setActiveToast(null);
    });
  }, [userId]);

  const hasQuery = query.trim().length > 0;
  const unreadCount = notifications.filter((item) => !item.read).length;

  const formatNotificationTime = (dateString) => {
    if (!dateString) return "";

    return new Date(dateString).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    const refreshProfileImage = () => {
      setProfileImage(localStorage.getItem("profileImage"));
    };

    window.addEventListener("storage", refreshProfileImage);
    window.addEventListener("profileImageUpdated", refreshProfileImage);

    return () => {
      window.removeEventListener("storage", refreshProfileImage);
      window.removeEventListener("profileImageUpdated", refreshProfileImage);
    };
  }, []);

  useEffect(() => {
    const handleTradeNotification = (event) => {
      const notification = event.detail;

      setNotifications(getTradeNotifications(userId));

      if (notification?.type === "FILLED") {
        setActiveToast(notification);

        setTimeout(() => {
          setActiveToast(null);
        }, 4300);
      }
    };

    window.addEventListener("tradeNotificationCreated", handleTradeNotification);

    return () => {
      window.removeEventListener(
        "tradeNotificationCreated",
        handleTradeNotification
      );
    };
  }, [userId]);

  useEffect(() => {
    const checkFilledOrders = async () => {
      if (!userId) return;

      try {
        const response = await fetch(`/api/orders/user/${userId}`);
        const data = await response.json();

        if (!Array.isArray(data)) return;

        const filledOrders = data.filter(
          (order) => order.status === "FILLED" && !wasOrderNotified(userId, order.id)
        );

        filledOrders.forEach((order) => {
          createTradeNotification({
            userId,
            type: "FILLED",
            mode: "ADVANCED",
            orderId: order.id,
            side: order.side,
            symbol: order.stock_symbol,
            quantity: Number(order.filled_quantity || order.quantity || 0),
            price: Number(order.filled_price || 0),
            orderType: order.order_type || "MARKET",
            createdAt: order.filled_at || order.updated_at || order.created_at,
          });
        });
      } catch (error) {
        console.error("Filled order notification check failed:", error);
      }
    };

    checkFilledOrders();

    const interval = setInterval(checkFilledOrders, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  const fetchLogo = useCallback(async (symbol) => {
    try {
      const response = await fetch(`/api/stocks/profile/${symbol}`);
      const data = await response.json();

      return {
        logo: data.logo || null,
        name: data.name || symbol,
      };
    } catch {
      return {
        logo: null,
        name: symbol,
      };
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchTopStocks = async () => {
      try {
        setTopLoading(true);

        const results = await Promise.all(
          defaultTopSymbols.map(async (symbol) => {
            const quoteResponse = await fetch(`/api/stocks/quote/${symbol}`);
            const quoteData = await quoteResponse.json();

            const profile = await fetchLogo(symbol);

            return {
              symbol,
              description: profile.name || "US Equity",
              logo: profile.logo,
              price: Number(quoteData.c) || 0,
              changePercent: Number(quoteData.dp) || 0,
            };
          })
        );

        const rankedStocks = results
          .filter((stock) => stock.price > 0)
          .sort((a, b) => b.changePercent - a.changePercent)
          .slice(0, 5);

        setTopStocks(rankedStocks);
      } catch (error) {
        console.error("Top stocks error:", error);
        setTopStocks([]);
      } finally {
        setTopLoading(false);
      }
    };

    fetchTopStocks();
  }, [fetchLogo]);

  useEffect(() => {
    const fetchSearchResults = async () => {
      const cleanQuery = query.trim();

      if (!cleanQuery) {
        setSearchResults([]);
        return;
      }

      try {
        setSearchLoading(true);

        const searchResponse = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(cleanQuery)}`
        );

        const searchData = await searchResponse.json();

        const filteredResults = Array.isArray(searchData)
          ? searchData
              .filter((stock) => stock.symbol && stock.description)
              .slice(0, 5)
          : [];

        const resultsWithPrices = await Promise.all(
          filteredResults.map(async (stock) => {
            try {
              const quoteResponse = await fetch(
                `/api/stocks/quote/${stock.symbol}`
              );
              const quoteData = await quoteResponse.json();

              const profile = await fetchLogo(stock.symbol);

              return {
                symbol: stock.symbol,
                description: profile.name || stock.description,
                logo: profile.logo,
                price: Number(quoteData.c) || 0,
                changePercent: Number(quoteData.dp) || 0,
              };
            } catch {
              return {
                symbol: stock.symbol,
                description: stock.description,
                logo: null,
                price: 0,
                changePercent: 0,
              };
            }
          })
        );

        setSearchResults(resultsWithPrices);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const delay = setTimeout(fetchSearchResults, 300);
    return () => clearTimeout(delay);
  }, [fetchLogo, query]);

  const visibleStocks = useMemo(() => {
    return hasQuery ? searchResults : topStocks;
  }, [hasQuery, searchResults, topStocks]);

  const openStockPage = (symbol) => {
    setSearchOpen(false);
    setQuery("");
    navigate(`/stocks/${symbol.toUpperCase()}`);
  };

  const openNotificationCenter = () => {
    const nextOpen = !notificationsOpen;

    setNotificationsOpen(nextOpen);

    if (!notificationsOpen) {
      const updated = markAllNotificationsRead(userId);
      setNotifications(updated);
    }
  };

  const openTransactionsPage = () => {
    setNotificationsOpen(false);
    setActiveToast(null);
    navigate("/history");
  };

  return (
    <header className="portfolio-topbar">
      <div
        className={`portfolio-search-wrap ${searchOpen ? "search-active" : ""}`}
        ref={searchRef}
      >
        <div className="portfolio-search">
          <Search size={18} />

          <input
            placeholder="Search stocks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
          />

          {query && (
            <button
              className="search-clear-btn"
              onClick={() => {
                setQuery("");
                setSearchResults([]);
              }}
              type="button"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {searchOpen && (
          <div className="topbar-search-panel">
            <div className="search-panel-tabs">
              <button className="active" type="button">
                Top Stocks
              </button>
              <button type="button">US Market</button>
            </div>

            <div className="search-panel-heading">
              <span>{hasQuery ? "Search Results" : "Top stocks today"}</span>
              <small>Price / Change</small>
            </div>

            {(searchLoading || topLoading) && (
              <p className="search-panel-loading">Loading stocks...</p>
            )}

            {!searchLoading && !topLoading && visibleStocks.length === 0 && (
              <p className="search-panel-empty">No stocks found.</p>
            )}

            {!searchLoading &&
              !topLoading &&
              visibleStocks.map((stock, index) => {
                const isUp = stock.changePercent >= 0;

                return (
                  <button
                    key={`${stock.symbol}-${index}`}
                    className="search-stock-row"
                    onClick={() => openStockPage(stock.symbol)}
                    type="button"
                  >
                    <div className="search-stock-left">
                      <div className="search-stock-logo">
                        {stock.logo ? (
                          <img src={stock.logo} alt={stock.symbol} />
                        ) : (
                          stock.symbol.charAt(0)
                        )}
                      </div>

                      <div>
                        <div className="search-stock-title">
                          <strong>{stock.symbol}</strong>
                          <span>#{index + 1}</span>
                        </div>

                        <p>{stock.description || "US Equity"}</p>
                      </div>
                    </div>

                    <div className="search-stock-middle">
                      <p>${stock.price ? stock.price.toFixed(2) : "0.00"}</p>
                    </div>

                    <div className="search-stock-right">
                      <span className={isUp ? "stock-up" : "stock-down"}>
                        {isUp ? "↗" : "↘"}{" "}
                        {Math.abs(stock.changePercent).toFixed(2)}%
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </div>

      <div className="portfolio-user-actions">
        <button
          className="top-icon-btn"
          onClick={() => navigate("/settings")}
          type="button"
        >
          <Settings size={18} />
        </button>

        <div className="notification-wrap" ref={notificationRef}>
          <button
            className={`top-icon-btn notification-btn ${
              unreadCount > 0 ? "has-unread" : ""
            }`}
            onClick={openNotificationCenter}
            type="button"
          >
            <Bell size={18} />

            {unreadCount > 0 && (
              <>
                <span className="notification-dot"></span>
                <span className="notification-count">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              </>
            )}
          </button>

          {activeToast && (
            <button
              className="trade-fill-toast"
              onClick={openTransactionsPage}
              type="button"
            >
              <div className="trade-fill-icon">
                <CheckCircle2 size={21} />
              </div>

              <div className="trade-fill-content">
                <div className="trade-fill-top">
                  <span>
  {activeToast.mode === "SIMPLE"
    ? "SIMPLE TRANSACTION"
    : "ADVANCED TRANSACTION"}
</span>
                  <small>{formatNotificationTime(activeToast.createdAt)}</small>
                </div>

                <strong>{activeToast.title}</strong>

                <p>{activeToast.body}</p>
              </div>
            </button>
          )}

          {notificationsOpen && (
            <div className="notifications-panel">
              <div className="notifications-head">
                <div>
                  <h3>Notifications</h3>
                  <p>Order updates and trade confirmations</p>
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="notifications-empty">
                  <Bell size={24} />
                  <p>No notifications yet.</p>
                </div>
              ) : (
                <div className="notifications-list">
                  {notifications.map((notification) => (
                    <button
                      className="notification-item"
                      key={notification.id}
                      onClick={openTransactionsPage}
                      type="button"
                    >
                      <div className="notification-item-icon">
                        {notification.type === "FILLED" ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <CandlestickChart size={18} />
                        )}
                      </div>

                      <div className="notification-item-body">
                        <div className="notification-item-top">
                          <strong>{notification.title}</strong>
                          <small>
                            {formatNotificationTime(notification.createdAt)}
                          </small>
                        </div>

                        <p>{notification.body}</p>

                        <div className="notification-meta">
                          <span>{notification.symbol}</span>
                          <span>${Number(notification.price || 0).toFixed(2)}</span>
                          <span>{notification.side}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="portfolio-user-info">
          <strong>{user?.fullName || "User"}</strong>
          <p>{user?.email || "student@example.com"}</p>
        </div>

        <div className="user-avatar">
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className="topbar-avatar-img"
            />
          ) : (
            (user?.fullName || "U").charAt(0).toUpperCase()
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
