import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  Clock3,
  ExternalLink,
  PieChart as PieChartIcon,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Topbar from "../components/Topbar";
import logo from "../assets/logo.png";
import "../App.css";

const fallbackLogoDomains = {
  AAPL: "apple.com",
  TSLA: "tesla.com",
  NVDA: "nvidia.com",
  META: "meta.com",
  MSFT: "microsoft.com",
  AMZN: "amazon.com",
  GOOGL: "google.com",
  GOOG: "google.com",
  NFLX: "netflix.com",
  AMD: "amd.com",
  INTC: "intel.com",
  JPM: "jpmorganchase.com",
  BAC: "bankofamerica.com",
  V: "visa.com",
  MA: "mastercard.com",
  DIS: "disney.com",
  NKE: "nike.com",
  KO: "coca-colacompany.com",
  PEP: "pepsico.com",
};

const chartColors = [
  "#6741BF",
  "#7b5ce6",
  "#4f8cff",
  "#14b8a6",
  "#f59e0b",
  "#ff5c70",
  "#c6b7ff",
  "#7ee787",
];

const holdingFilters = [
  { key: "ALL", label: "All positions" },
  { key: "GAINERS", label: "Gainers" },
  { key: "LOSERS", label: "Losers" },
];

const sortOptions = [
  { value: "VALUE_DESC", label: "Highest value" },
  { value: "RETURN_DESC", label: "Best return" },
  { value: "RETURN_ASC", label: "Worst return" },
  { value: "SYMBOL_ASC", label: "Symbol A-Z" },
];

function formatCurrency(value) {
  const number = Number(value || 0);
  const sign = number < 0 ? "-" : "";

  return `${sign}$${Math.abs(number).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value) {
  const number = Number(value || 0);
  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function formatQuantity(value) {
  const number = Number(value || 0);

  return number.toLocaleString(undefined, {
    minimumFractionDigits: number % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 4,
  });
}

function getFallbackLogoUrl(symbol) {
  const domain = fallbackLogoDomains[symbol];
  return domain ? `https://logo.clearbit.com/${domain}` : null;
}

function getRiskTone(percent) {
  if (percent >= 50) return "High concentration";
  if (percent >= 30) return "Moderate concentration";
  return "Healthy spread";
}

function PortfolioPage() {
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  const [portfolioData, setPortfolioData] = useState(null);
  const [holdingQuotes, setHoldingQuotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [sortMode, setSortMode] = useState("VALUE_DESC");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        setLoading(true);

        const response = await fetch(`/api/portfolio/${userId}`);
        const data = await response.json();

        setPortfolioData(data);
      } catch (error) {
        console.error("Portfolio error:", error);
        setPortfolioData(null);
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchPortfolio();
  }, [userId, refreshKey]);

  const holdings = useMemo(() => portfolioData?.holdings || [], [portfolioData]);
  const cashBalance = Number(portfolioData?.portfolio?.cashBalance || 0);

  useEffect(() => {
    const fetchHoldingDetails = async () => {
      if (!holdings.length) {
        setHoldingQuotes({});
        return;
      }

      try {
        setQuoteLoading(true);

        const entries = await Promise.all(
          holdings.map(async (holding) => {
            const symbol = String(holding.stock_symbol || "").toUpperCase();

            const [quoteResult, profileResult] = await Promise.allSettled([
              fetch(`/api/stocks/quote/${symbol}`).then((response) =>
                response.json()
              ),
              fetch(`/api/stocks/profile/${symbol}`).then((response) =>
                response.json()
              ),
            ]);

            const quote =
              quoteResult.status === "fulfilled" && quoteResult.value
                ? quoteResult.value
                : {};
            const profile =
              profileResult.status === "fulfilled" && profileResult.value
                ? profileResult.value
                : {};

            const currentPrice = Number(quote.c);
            const previousClose = Number(quote.pc);
            const quotedChangePercent = Number(quote.dp);
            const calculatedChangePercent =
              Number.isFinite(currentPrice) &&
              currentPrice > 0 &&
              Number.isFinite(previousClose) &&
              previousClose > 0
                ? ((currentPrice - previousClose) / previousClose) * 100
                : 0;

            return [
              symbol,
              {
                currentPrice:
                  Number.isFinite(currentPrice) && currentPrice > 0
                    ? currentPrice
                    : null,
                previousClose:
                  Number.isFinite(previousClose) && previousClose > 0
                    ? previousClose
                    : null,
                changePercent:
                  Number.isFinite(quotedChangePercent) &&
                  quotedChangePercent !== 0
                    ? quotedChangePercent
                    : calculatedChangePercent,
                logo: profile.logo || getFallbackLogoUrl(symbol),
                name: profile.name || `${symbol} equity`,
              },
            ];
          })
        );

        setHoldingQuotes(Object.fromEntries(entries));
      } catch (error) {
        console.error("Holding quote error:", error);
      } finally {
        setQuoteLoading(false);
      }
    };

    fetchHoldingDetails();
  }, [holdings]);

  const enrichedHoldings = useMemo(() => {
    return holdings.map((holding) => {
      const symbol = String(holding.stock_symbol || "").toUpperCase();
      const quantity = Number(holding.quantity) || 0;
      const avgBuyPrice = Number(holding.average_buy_price) || 0;
      const quote = holdingQuotes[symbol] || {};
      const currentPrice = quote.currentPrice || avgBuyPrice;
      const marketValue = quantity * currentPrice;
      const costBasis = quantity * avgBuyPrice;
      const profitLoss = marketValue - costBasis;
      const profitLossPercent =
        costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;
      const dailyChangeDollar =
        quote.previousClose && quote.previousClose > 0
          ? quantity * (currentPrice - quote.previousClose)
          : 0;

      return {
        symbol,
        name: quote.name || `${symbol} equity`,
        logo: quote.logo || getFallbackLogoUrl(symbol),
        quantity,
        avgBuyPrice,
        currentPrice,
        marketValue,
        costBasis,
        profitLoss,
        profitLossPercent,
        dailyChangeDollar,
        dailyChangePercent: Number(quote.changePercent || 0),
        updatedAt: holding.updated_at,
      };
    });
  }, [holdings, holdingQuotes]);

  const totals = useMemo(() => {
    const holdingsValue = enrichedHoldings.reduce(
      (sum, item) => sum + item.marketValue,
      0
    );
    const costBasis = enrichedHoldings.reduce(
      (sum, item) => sum + item.costBasis,
      0
    );
    const profitLoss = holdingsValue - costBasis;
    const dailyChange = enrichedHoldings.reduce(
      (sum, item) => sum + item.dailyChangeDollar,
      0
    );
    const portfolioValue = cashBalance + holdingsValue;

    return {
      holdingsValue,
      costBasis,
      profitLoss,
      profitLossPercent: costBasis > 0 ? (profitLoss / costBasis) * 100 : 0,
      dailyChange,
      portfolioValue,
      cashWeight: portfolioValue > 0 ? (cashBalance / portfolioValue) * 100 : 0,
      investedWeight:
        portfolioValue > 0 ? (holdingsValue / portfolioValue) * 100 : 0,
    };
  }, [cashBalance, enrichedHoldings]);

  const holdingsWithWeights = useMemo(() => {
    return enrichedHoldings.map((item) => ({
      ...item,
      portfolioWeight:
        totals.portfolioValue > 0
          ? (item.marketValue / totals.portfolioValue) * 100
          : 0,
      investmentWeight:
        totals.holdingsValue > 0
          ? (item.marketValue / totals.holdingsValue) * 100
          : 0,
    }));
  }, [enrichedHoldings, totals.holdingsValue, totals.portfolioValue]);

  const sortedHoldings = useMemo(() => {
    const cleanSearch = searchTerm.trim().toUpperCase();

    return holdingsWithWeights
      .filter((item) => {
        const matchesSearch =
          !cleanSearch ||
          item.symbol.includes(cleanSearch) ||
          item.name.toUpperCase().includes(cleanSearch);

        if (!matchesSearch) return false;
        if (activeFilter === "GAINERS") return item.profitLoss >= 0;
        if (activeFilter === "LOSERS") return item.profitLoss < 0;

        return true;
      })
      .sort((a, b) => {
        if (sortMode === "RETURN_DESC") {
          return b.profitLossPercent - a.profitLossPercent;
        }

        if (sortMode === "RETURN_ASC") {
          return a.profitLossPercent - b.profitLossPercent;
        }

        if (sortMode === "SYMBOL_ASC") {
          return a.symbol.localeCompare(b.symbol);
        }

        return b.marketValue - a.marketValue;
      });
  }, [activeFilter, holdingsWithWeights, searchTerm, sortMode]);

  const topHoldings = useMemo(
    () =>
      [...holdingsWithWeights]
        .sort((a, b) => b.marketValue - a.marketValue)
        .slice(0, 4),
    [holdingsWithWeights]
  );

  const bestPerformer = useMemo(() => {
    if (!holdingsWithWeights.length) return null;
    return [...holdingsWithWeights].sort(
      (a, b) => b.profitLossPercent - a.profitLossPercent
    )[0];
  }, [holdingsWithWeights]);

  const worstPerformer = useMemo(() => {
    if (!holdingsWithWeights.length) return null;
    return [...holdingsWithWeights].sort(
      (a, b) => a.profitLossPercent - b.profitLossPercent
    )[0];
  }, [holdingsWithWeights]);

  const largestHolding = topHoldings[0] || null;
  const largestWeight = largestHolding?.portfolioWeight || 0;

  const allocationData = useMemo(() => {
    const sortedByValue = [...holdingsWithWeights].sort(
      (a, b) => b.marketValue - a.marketValue
    );

    const visibleHoldings = sortedByValue.filter(
      (item, index) => index < 3 || item.portfolioWeight >= 5
    );

    const holdingsAllocation = visibleHoldings.map((item, index) => ({
      name: item.symbol,
      value: Number(item.marketValue.toFixed(2)),
      rawValue: item.marketValue,
      color: chartColors[index % chartColors.length],
      percent: item.portfolioWeight,
    }));

    const visibleValue = visibleHoldings.reduce(
      (sum, item) => sum + item.marketValue,
      0
    );

    const remainingValue = totals.holdingsValue - visibleValue;

    if (remainingValue > 0) {
      holdingsAllocation.push({
        name: "Other",
        value: Number(remainingValue.toFixed(2)),
        rawValue: remainingValue,
        color: "#2f3442",
        percent:
          totals.portfolioValue > 0
            ? (remainingValue / totals.portfolioValue) * 100
            : 0,
      });
    }

    if (cashBalance > 0) {
      holdingsAllocation.push({
        name: "Cash",
        value: Number(cashBalance.toFixed(2)),
        rawValue: cashBalance,
        color: "#5b9cff",
        percent: totals.cashWeight,
      });
    }

    if (!holdingsAllocation.length) {
      return [
        {
          name: "No assets",
          value: 1,
          rawValue: 0,
          color: "#252934",
          percent: 100,
        },
      ];
    }

    return holdingsAllocation;
  }, [
    cashBalance,
    holdingsWithWeights,
    totals.cashWeight,
    totals.holdingsValue,
    totals.portfolioValue,
  ]);

  const valueChartData = useMemo(() => {
    if (!holdingsWithWeights.length) {
      return [{ symbol: "Cash", value: Number(cashBalance.toFixed(2)), cost: 0 }];
    }

    return [...holdingsWithWeights]
      .sort((a, b) => b.marketValue - a.marketValue)
      .slice(0, 7)
      .map((item) => ({
        symbol: item.symbol,
        value: Number(item.marketValue.toFixed(2)),
        cost: Number(item.costBasis.toFixed(2)),
      }));
  }, [cashBalance, holdingsWithWeights]);

  const performanceTrendData = useMemo(() => {
    if (!holdingsWithWeights.length) {
      return [
        { name: "Cost", value: 0 },
        { name: "Now", value: 0 },
      ];
    }

    return [
      { name: "Cost basis", value: Number(totals.costBasis.toFixed(2)) },
      { name: "Market value", value: Number(totals.holdingsValue.toFixed(2)) },
    ];
  }, [holdingsWithWeights.length, totals.costBasis, totals.holdingsValue]);

  const portfolioInsights = useMemo(() => {
    if (!holdingsWithWeights.length) {
      return [
        {
          icon: Briefcase,
          title: "Build your first position",
          text: "Your portfolio is currently cash only. Use the market page when you are ready to simulate a trade.",
          tone: "neutral",
        },
        {
          icon: Wallet,
          title: "Cash reserve ready",
          text: `${formatCurrency(cashBalance)} is available for future simulator orders.`,
          tone: "positive",
        },
      ];
    }

    const insights = [
      {
        icon: ShieldCheck,
        title: getRiskTone(largestWeight),
        text: largestHolding
          ? `${largestHolding.symbol} is ${largestWeight.toFixed(
              1
            )}% of the total portfolio.`
          : "Your holdings are spread across your open positions.",
        tone: largestWeight >= 50 ? "warning" : "positive",
      },
      {
        icon: Wallet,
        title:
          totals.cashWeight >= 35
            ? "Large cash reserve"
            : "Cash level looks active",
        text: `${totals.cashWeight.toFixed(
          1
        )}% of your portfolio is available cash.`,
        tone: totals.cashWeight >= 35 ? "neutral" : "positive",
      },
    ];

    if (bestPerformer) {
      insights.push({
        icon: TrendingUp,
        title: "Best performer",
        text: `${bestPerformer.symbol} is up ${formatPercent(
          bestPerformer.profitLossPercent
        )} vs your average cost.`,
        tone: "positive",
      });
    }

    if (worstPerformer && worstPerformer.profitLoss < 0) {
      insights.push({
        icon: TrendingDown,
        title: "Needs review",
        text: `${worstPerformer.symbol} is down ${formatPercent(
          worstPerformer.profitLossPercent
        )} vs your average cost.`,
        tone: "warning",
      });
    }

    return insights.slice(0, 4);
  }, [
    bestPerformer,
    cashBalance,
    holdingsWithWeights.length,
    largestHolding,
    largestWeight,
    totals.cashWeight,
    worstPerformer,
  ]);

  const gainersCount = holdingsWithWeights.filter(
    (item) => item.profitLoss >= 0
  ).length;
  const losersCount = holdingsWithWeights.length - gainersCount;

  const lastUpdated = new Date().toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="portfolio-shell">
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">
            <img src={logo} alt="logo" className="logo-img" />
            <h2>IPSimulator</h2>
          </div>

          <nav className="sidebar-nav">
            <Link className="nav-item" to="/dashboard">
              Dashboard
            </Link>
            <Link className="nav-item active" to="/portfolio">
              Portfolio
            </Link>
            <Link className="nav-item" to="/trade">
              Market
            </Link>
            <Link className="nav-item" to="/history">
              Transactions
            </Link>
            <Link className="nav-item" to="/settings">
              Settings
            </Link>
          </nav>
        </div>

        <div className="sidebar-card">
          <p className="sidebar-card-title">Portfolio View</p>
          <p className="sidebar-card-text">
            Track allocation, live position value, cost basis, and simulator
            returns.
          </p>
          <Link className="sidebar-card-btn sidebar-card-link" to="/trade">
            Explore market
          </Link>
        </div>
      </aside>

      <main className="main-content portfolio-redesign-main">
        <Topbar title="Portfolio" />

        <section className="portfolio-page-head">
          <div>
            <p className="portfolio-kicker">Portfolio dashboard</p>
            <h1>Your holdings, performance, and allocation</h1>
            <p>
              A clearer view of where your money is placed, what is available,
              and which positions are moving your simulator portfolio.
            </p>
          </div>

          <div className="portfolio-head-actions">
            <span className="portfolio-refresh-meta">
              <Clock3 size={15} />
              Updated {lastUpdated}
            </span>
            <button
              className="portfolio-refresh-btn"
              onClick={() => setRefreshKey((value) => value + 1)}
              type="button"
              disabled={loading || quoteLoading}
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>
        </section>

        <section className="portfolio-summary-grid">
          <article className="portfolio-summary-card primary">
            <div className="portfolio-summary-top">
              <div>
                <span className="portfolio-card-label">Total portfolio value</span>
                <h2>
                  {loading || quoteLoading
                    ? "Loading..."
                    : formatCurrency(totals.portfolioValue)}
                </h2>
              </div>
              <div
                className={`portfolio-trend-pill ${
                  totals.profitLoss >= 0 ? "positive" : "negative"
                }`}
              >
                {totals.profitLoss >= 0 ? (
                  <ArrowUpRight size={17} />
                ) : (
                  <ArrowDownRight size={17} />
                )}
                {formatPercent(totals.profitLossPercent)}
              </div>
            </div>

            <div className="portfolio-balance-bars">
              <div>
                <span style={{ width: `${Math.min(totals.investedWeight, 100)}%` }}></span>
              </div>
              <div className="portfolio-balance-legend">
                <p>
                  Invested <strong>{formatCurrency(totals.holdingsValue)}</strong>
                </p>
                <p>
                  Cash <strong>{formatCurrency(cashBalance)}</strong>
                </p>
              </div>
            </div>

            <div className="portfolio-summary-meta">
              <div>
                <span>Cost basis</span>
                <strong>{formatCurrency(totals.costBasis)}</strong>
              </div>
              <div>
                <span>Unrealized P/L</span>
                <strong
                  className={totals.profitLoss >= 0 ? "profit-text" : "loss-text"}
                >
                  {totals.profitLoss >= 0 ? "+" : ""}
                  {formatCurrency(totals.profitLoss)}
                </strong>
              </div>
              <div>
                <span>Daily move</span>
                <strong
                  className={totals.dailyChange >= 0 ? "profit-text" : "loss-text"}
                >
                  {totals.dailyChange >= 0 ? "+" : ""}
                  {formatCurrency(totals.dailyChange)}
                </strong>
              </div>
            </div>
          </article>

          <article className="portfolio-summary-card">
            <div className="portfolio-metric-icon">
              <Wallet size={20} />
            </div>
            <span className="portfolio-card-label">Available cash</span>
            <h3>{formatCurrency(cashBalance)}</h3>
            <p>{totals.cashWeight.toFixed(1)}% of total portfolio</p>
          </article>

          <article className="portfolio-summary-card">
            <div className="portfolio-metric-icon">
              <Briefcase size={20} />
            </div>
            <span className="portfolio-card-label">Open positions</span>
            <h3>{holdingsWithWeights.length}</h3>
            <p>
              {gainersCount} gainers / {losersCount} losers
            </p>
          </article>

          <article className="portfolio-summary-card">
            <div className="portfolio-metric-icon">
              <Activity size={20} />
            </div>
            <span className="portfolio-card-label">Largest holding</span>
            <h3>{largestHolding ? largestHolding.symbol : "None"}</h3>
            <p>
              {largestHolding
                ? `${largestWeight.toFixed(1)}% portfolio weight`
                : "No active holdings yet"}
            </p>
          </article>
        </section>

        <section className="portfolio-detail-grid">
          <div className="portfolio-detail-main">
            <section className="portfolio-panel allocation-panel">
              <div className="portfolio-panel-head">
                <div>
                  <p className="portfolio-panel-kicker">Allocation</p>
                  <h2>Where your portfolio sits</h2>
                </div>
                <span className="portfolio-panel-badge">
                  <PieChartIcon size={15} />
                  {totals.investedWeight.toFixed(1)}% invested
                </span>
              </div>

              <div className="portfolio-allocation-grid">
                <div className="portfolio-pie-wrap">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={allocationData}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        innerRadius={78}
                        outerRadius={112}
                        paddingAngle={2}
                        cornerRadius={10}
                        stroke="rgba(8, 8, 12, 0.88)"
                        strokeWidth={5}
                        isAnimationActive={false}
                      >
                        {allocationData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{
                          background: "#111111",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          color: "#ffffff",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="portfolio-pie-center">
                    <span>Total</span>
                    <strong>{formatCurrency(totals.portfolioValue)}</strong>
                  </div>
                </div>

                <div className="portfolio-allocation-list">
                  {allocationData.map((item) => (
                    <div
                      className="portfolio-allocation-row"
                      key={item.name}
                      style={{
                        "--allocation-color": item.color,
                        "--allocation-percent": `${Math.min(item.percent, 100)}%`,
                      }}
                    >
                      <div>
                        <span></span>
                        <p>{item.name}</p>
                      </div>
                      <strong>{formatCurrency(item.rawValue)}</strong>
                      <small>{item.percent.toFixed(1)}%</small>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="portfolio-panel holdings-panel">
              <div className="portfolio-panel-head holdings-head">
                <div>
                  <p className="portfolio-panel-kicker">Positions</p>
                  <h2>Holdings breakdown</h2>
                </div>

                <div className="holdings-tools">
                  <div className="holdings-search">
                    <Search size={16} />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search holdings"
                    />
                  </div>

                  <label className="holdings-sort">
                    <SlidersHorizontal size={15} />
                    <select
                      className="portfolio-sort-select"
                      value={sortMode}
                      onChange={(event) => setSortMode(event.target.value)}
                    >
                      {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="holdings-filter-tabs">
                {holdingFilters.map((filter) => (
                  <button
                    className={activeFilter === filter.key ? "active" : ""}
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key)}
                    type="button"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="portfolio-holdings-table">
                <div className="portfolio-holdings-head">
                  <span>Asset</span>
                  <span>Quantity</span>
                  <span>Avg cost</span>
                  <span>Live price</span>
                  <span>Market value</span>
                  <span>P/L</span>
                  <span>Weight</span>
                  <span></span>
                </div>

                {loading || quoteLoading ? (
                  <p className="portfolio-empty-state">Loading holdings...</p>
                ) : sortedHoldings.length === 0 ? (
                  <div className="portfolio-empty-card">
                    <Briefcase size={28} />
                    <h3>No matching holdings</h3>
                    <p>
                      Try another search or visit the market page to start
                      building your simulator portfolio.
                    </p>
                    <Link to="/trade">
                      Explore market
                      <ExternalLink size={15} />
                    </Link>
                  </div>
                ) : (
                  sortedHoldings.map((item) => {
                    const isProfit = item.profitLoss >= 0;

                    return (
                      <div className="portfolio-holding-row" key={item.symbol}>
                        <div className="portfolio-asset-cell">
                          <div className="portfolio-asset-logo">
                            {item.logo ? (
                              <img
                                src={item.logo}
                                alt={`${item.symbol} logo`}
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              item.symbol.charAt(0)
                            )}
                          </div>
                          <div>
                            <Link to={`/stocks/${item.symbol}`}>
                              {item.symbol}
                            </Link>
                            <p>{item.name}</p>
                          </div>
                        </div>

                        <div>
                          <strong>{formatQuantity(item.quantity)}</strong>
                          <p>shares</p>
                        </div>

                        <div>
                          <strong>{formatCurrency(item.avgBuyPrice)}</strong>
                          <p>per share</p>
                        </div>

                        <div>
                          <strong>{formatCurrency(item.currentPrice)}</strong>
                          <p
                            className={
                              item.dailyChangePercent >= 0
                                ? "profit-text"
                                : "loss-text"
                            }
                          >
                            {formatPercent(item.dailyChangePercent)}
                          </p>
                        </div>

                        <div>
                          <strong>{formatCurrency(item.marketValue)}</strong>
                          <p>{formatCurrency(item.costBasis)} cost</p>
                        </div>

                        <div>
                          <strong className={isProfit ? "profit-text" : "loss-text"}>
                            {isProfit ? "+" : ""}
                            {formatCurrency(item.profitLoss)}
                          </strong>
                          <p className={isProfit ? "profit-text" : "loss-text"}>
                            {formatPercent(item.profitLossPercent)}
                          </p>
                        </div>

                        <div>
                          <strong>{item.portfolioWeight.toFixed(1)}%</strong>
                          <div className="portfolio-weight-bar">
                            <span
                              style={{
                                width: `${Math.min(item.portfolioWeight, 100)}%`,
                              }}
                            ></span>
                          </div>
                        </div>

                        <Link
                          className="portfolio-row-action"
                          to={`/stocks/${item.symbol}`}
                          aria-label={`View ${item.symbol}`}
                        >
                          <ExternalLink size={16} />
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <aside className="portfolio-detail-side">
            <section className="portfolio-panel portfolio-health-panel">
              <div className="portfolio-panel-head">
                <div>
                  <p className="portfolio-panel-kicker">Health check</p>
                  <h2>Portfolio insights</h2>
                </div>
                <span className="portfolio-panel-badge">
                  <ShieldCheck size={15} />
                  Simulator
                </span>
              </div>

              <div className="portfolio-insight-list">
                {portfolioInsights.map((insight) => {
                  const InsightIcon = insight.icon;

                  return (
                    <div
                      className={`portfolio-insight-item ${insight.tone}`}
                      key={insight.title}
                    >
                      <span>
                        <InsightIcon size={18} />
                      </span>
                      <div>
                        <h3>{insight.title}</h3>
                        <p>{insight.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="portfolio-panel">
              <div className="portfolio-panel-head">
                <div>
                  <p className="portfolio-panel-kicker">Position value</p>
                  <h2>Value vs cost</h2>
                </div>
                <span className="portfolio-panel-badge">
                  <BarChart3 size={15} />
                  Top assets
                </span>
              </div>

              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={valueChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.07)"
                    vertical={false}
                  />
                  <XAxis dataKey="symbol" stroke="#8f95a3" />
                  <YAxis stroke="#8f95a3" tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      background: "#111111",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#ffffff",
                    }}
                  />
                  <Bar dataKey="cost" fill="#252934" radius={[7, 7, 0, 0]} />
                  <Bar dataKey="value" fill="#6741BF" radius={[7, 7, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section className="portfolio-panel">
              <div className="portfolio-panel-head">
                <div>
                  <p className="portfolio-panel-kicker">Performance</p>
                  <h2>Cost basis vs now</h2>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={performanceTrendData}>
                  <defs>
                    <linearGradient id="portfolioPerformanceArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6741BF" stopOpacity={0.42} />
                      <stop offset="100%" stopColor="#6741BF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.07)"
                    vertical={false}
                  />
                  <XAxis dataKey="name" stroke="#8f95a3" />
                  <YAxis stroke="#8f95a3" tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      background: "#111111",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#ffffff",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#7b5ce6"
                    strokeWidth={3}
                    fill="url(#portfolioPerformanceArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default PortfolioPage;
