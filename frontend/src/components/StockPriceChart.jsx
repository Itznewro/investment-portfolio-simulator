import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const TIMEFRAME_OPTIONS = [
  { label: "1M", limit: 30 },
  { label: "1Y", limit: 365 },
  { label: "All", limit: null },
];

function formatCandleDate(timestamp, timeframe) {
  const date = new Date(timestamp * 1000);

  if (timeframe === "1M") {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StockChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;

  if (!point) return null;

  return (
    <div className="stock-chart-tooltip">
      <div className="stock-chart-tooltip-price">
        {Number(point.price).toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
      <div className="stock-chart-tooltip-time">{point.time}</div>
    </div>
  );
}

function StockPriceChart({ symbol, onHoverPrice }) {
  const [candles, setCandles] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [timeframe, setTimeframe] = useState("1M");

  useEffect(() => {
    const controller = new AbortController();

    const fetchCandles = async () => {
      if (!symbol) {
        setStatus("empty");
        setCandles([]);
        return;
      }

      setStatus("loading");
      setErrorMessage("");
      setCandles([]);

      try {
        const res = await fetch(
          `/api/stocks/candles/${encodeURIComponent(symbol)}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch candle data.");
        }

        const data = await res.json();

        if (data?.error) {
          throw new Error(data.error);
        }

        if (data?.s !== "ok") {
          setStatus("empty");
          return;
        }

        if (!Array.isArray(data.c) || !Array.isArray(data.t)) {
          setStatus("empty");
          return;
        }

        const normalizedCandles = data.c
          .map((closePrice, index) => {
            const price = Number(closePrice);
            const timestamp = Number(data.t[index]);

            if (!Number.isFinite(price) || !Number.isFinite(timestamp)) {
              return null;
            }

            return { price, timestamp };
          })
          .filter(Boolean);

        if (!normalizedCandles.length) {
          setStatus("empty");
          return;
        }

        setCandles(normalizedCandles);
        setStatus("ready");
      } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Stock candle error:", error);
        setErrorMessage("Unable to load chart data.");
        setStatus("error");
      }
    };

    onHoverPrice?.(null);
    fetchCandles();

    return () => controller.abort();
  }, [symbol, onHoverPrice]);

  const chartData = useMemo(() => {
    const selectedTimeframe = TIMEFRAME_OPTIONS.find(
      (option) => option.label === timeframe
    );
    const visibleCandles = selectedTimeframe?.limit
      ? candles.slice(-selectedTimeframe.limit)
      : candles;

    return visibleCandles.map((candle, index) => {
      return {
        index,
        price: candle.price,
        time: formatCandleDate(candle.timestamp, timeframe),
      };
    });
  }, [candles, timeframe]);

  const yDomain = useMemo(() => {
    if (!chartData.length) return ["dataMin - 2", "dataMax + 2"];

    const prices = chartData.map((point) => point.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = Math.max((max - min) * 0.18, max * 0.006, 1);

    return [min - padding, max + padding];
  }, [chartData]);

  const safeSymbol = (symbol || "stock").replace(/[^a-zA-Z0-9]/g, "");
  const gradientId = `stockGradient-${safeSymbol}`;
  const dotsId = `stockDots-${safeSymbol}`;
  const stateMessage =
    status === "loading"
      ? "Loading chart data..."
      : status === "error"
        ? errorMessage
        : "No candle data available.";

  return (
    <div className="stock-chart-wrapper">
      <div className="chart-timeframes">
        {TIMEFRAME_OPTIONS.map(({ label }) => (
          <button
            key={label}
            className={timeframe === label ? "active" : ""}
            onClick={() => {
              setTimeframe(label);
              onHoverPrice?.(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {chartData.length ? (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart
            data={chartData}
            onMouseMove={(e) => {
              const point = e?.activePayload?.[0]?.payload;
              if (point) onHoverPrice?.(point);
            }}
            onMouseLeave={() => onHoverPrice?.(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6741bf" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#6741bf" stopOpacity={0} />
              </linearGradient>

              <pattern
                id={dotsId}
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r="1" fill="#6741bf" opacity="0.2" />
              </pattern>
            </defs>

            <XAxis dataKey="index" hide />
            <YAxis hide domain={yDomain} />

            <Tooltip
              content={<StockChartTooltip />}
              cursor={{
                stroke: "rgba(157, 124, 255, 0.28)",
                strokeWidth: 1,
              }}
            />

            <Area
              type="monotone"
              dataKey="price"
              stroke="#7b5ce6"
              strokeWidth={3}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 6,
                fill: "#fff",
                stroke: "#6741bf",
                strokeWidth: 3,
              }}
              isAnimationActive={false}
            />

            <Area
              type="linear"
              dataKey="price"
              fill={`url(#${dotsId})`}
              stroke="none"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="stock-chart-message">{stateMessage}</div>
      )}
    </div>
  );
}

export default StockPriceChart;
