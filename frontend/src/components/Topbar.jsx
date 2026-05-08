import { Search, Settings, Bell, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

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

function Topbar({ title = "Dashboard" }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  const searchRef = useRef(null);

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [topLoading, setTopLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [topStocks, setTopStocks] = useState([]);

  const hasQuery = query.trim().length > 0;

  const fetchLogo = async (symbol) => {
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
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
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
  }, []);

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
  }, [query]);

  const visibleStocks = useMemo(() => {
    return hasQuery ? searchResults : topStocks;
  }, [hasQuery, searchResults, topStocks]);

  const openStockPage = (symbol) => {
    setSearchOpen(false);
    setQuery("");
    navigate(`/stocks/${symbol.toUpperCase()}`);
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
        <button className="top-icon-btn" onClick={() => navigate("/settings")}>
          <Settings size={18} />
        </button>

        <button className="top-icon-btn notification-btn">
          <Bell size={18} />
          <span className="notification-dot"></span>
        </button>

        <div className="portfolio-user-info">
          <strong>{user?.fullName || "User"}</strong>
          <p>{user?.email || "student@example.com"}</p>
        </div>

        <div className="user-avatar">
          {(user?.fullName || "U").charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}

export default Topbar;