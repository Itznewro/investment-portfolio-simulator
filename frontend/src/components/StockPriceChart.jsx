import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const RANGE_SETTINGS = {
  "1H": {
    durationMs: 1 * HOUR,
    points: 60, // 60 points across the last 1 hour (1 per minute)
  },
  "1D": {
    durationMs: 1 * DAY,
    stepMs: 10 * MINUTE,
  },
  "1W": {
    durationMs: 7 * DAY,
    stepMs: 30 * MINUTE,
  },
  "1M": {
    durationMs: 30 * DAY,
    stepMs: 1 * HOUR,
  },
  "1Y": {
    durationMs: 365 * DAY,
    stepMs: 1 * DAY,
  },
  All: {
    durationMs: 365 * DAY,
    stepMs: 2 * DAY,
  },
};

const RANGE_MOVE = {
  "1H": 0.004,
  "1D": 0.018,
  "1W": 0.05,
  "1M": 0.09,
  "1Y": 0.25,
  All: 0.32,
};

function buildTimeline(range) {
  const now = Date.now();
  const settings = RANGE_SETTINGS[range];
  const startTime = now - settings.durationMs;

  if (settings.points) {
    const gap = settings.durationMs / (settings.points - 1);

    return Array.from({ length: settings.points }, (_, index) => {
      return new Date(startTime + gap * index);
    });
  }

  const points = [];

  for (let time = startTime; time < now; time += settings.stepMs) {
    points.push(new Date(time));
  }

  points.push(new Date(now));
  return points;
}

function formatTime(date, range) {
  if (range === "1H" || range === "1D") {
    return date.toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (range === "1W" || range === "1M") {
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getSeed(symbol = "STOCK", timeframe = "1D") {
  return `${symbol}-${timeframe}`
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);
}

function getNoise(index, seed) {
  return (
    Math.sin(index * 0.9 + seed) * 0.55 +
    Math.sin(index * 1.61 + seed / 2) * 0.3 +
    Math.cos(index * 0.33 + seed / 3) * 0.15
  );
}

function getStartPrice({ quote, timeframe, symbol }) {
  const current = Number(quote?.c) || 0;
  const previousClose = Number(quote?.pc) || current;

  if (!current) return 0;

  if (timeframe === "1D" && previousClose > 0) {
    return previousClose;
  }

  const seed = getSeed(symbol, timeframe);
  const direction = current >= previousClose ? 1 : -1;
  const movement = RANGE_MOVE[timeframe] || 0.05;
  const variation = 0.65 + (seed % 9) / 20;

  return Math.max(0.01, current * (1 - direction * movement * variation));
}

function StockPriceChart({ symbol, onHoverPrice }) {
  const [quote, setQuote] = useState(null);
  const [timeframe, setTimeframe] = useState("1D");

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const res = await fetch(`/api/stocks/quote/${symbol}`);
        const data = await res.json();
        setQuote(data);
      } catch (error) {
        console.error("Stock quote error:", error);
        setQuote(null);
      }
    };

    if (symbol) fetchQuote();
  }, [symbol]);

  const chartData = useMemo(() => {
    if (!quote) return [];

    const current = Number(quote.c) || 0;
    if (!current) return [];

    const startPrice = getStartPrice({ quote, timeframe, symbol });
    const timeline = buildTimeline(timeframe);
    const seed = getSeed(symbol, timeframe);

    const movement = Math.abs(current - startPrice);
    const volatility = Math.max(
      movement * 0.25,
      current * (RANGE_MOVE[timeframe] || 0.02) * 0.18,
      current * 0.002
    );

    const data = timeline.map((date, index) => {
      const progress = index / Math.max(timeline.length - 1, 1);

      const trendPrice = startPrice + (current - startPrice) * progress;

      const noiseFade = Math.sin(Math.PI * progress);
      const fakeMovement = getNoise(index, seed) * volatility * noiseFade;

      const price = Math.max(0.01, trendPrice + fakeMovement);

      return {
        index,
        price: Number(price.toFixed(2)),
        time: formatTime(date, timeframe),
        fullTime: date.toLocaleString(),
      };
    });

    data[0].price = Number(startPrice.toFixed(2));
    data[data.length - 1].price = Number(current.toFixed(2));
    data[data.length - 1].time = "Now";

    return data;
  }, [quote, timeframe, symbol]);

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

  return (
    <div className="stock-chart-wrapper">
      <div className="chart-timeframes">
        {Object.keys(RANGE_SETTINGS).map((tf) => (
          <button
            key={tf}
            className={timeframe === tf ? "active" : ""}
            onClick={() => setTimeframe(tf)}
          >
            {tf}
          </button>
        ))}
      </div>

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

          <Tooltip content={() => null} />

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
    </div>
  );
}

export default StockPriceChart;