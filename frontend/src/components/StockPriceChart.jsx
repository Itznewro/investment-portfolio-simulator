import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const timeframeConfig = {
  "1H": { points: 60 },
  "1D": { points: 144 },
  "1W": { points: 168 },
  "1M": { points: 120 },
  "1Y": { points: 180 },
  All: { points: 220 },
};

function StockPriceChart({ symbol, onHoverPrice }) {
  const [quote, setQuote] = useState(null);
  const [timeframe, setTimeframe] = useState("1D");

  useEffect(() => {
    const fetchQuote = async () => {
      const res = await fetch(`/api/stocks/quote/${symbol}`);
      const data = await res.json();
      setQuote(data);
    };

    if (symbol) fetchQuote();
  }, [symbol]);

  const chartData = useMemo(() => {
  if (!quote) return [];

  const current = Number(quote.c);
  const prev = Number(quote.pc) || current;
  const high = Number(quote.h) || current * 1.02;
  const low = Number(quote.l) || current * 0.98;

  const points = timeframeConfig[timeframe].points;

  const seed = symbol
    ? symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
    : 20;

  let price = prev;
  const data = [];

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);

    const target = prev + (current - prev) * progress;

    const noise =
      Math.sin(i * 0.73 + seed) * 0.35 +
      Math.sin(i * 1.91 + seed / 2) * 0.22 +
      Math.cos(i * 0.37 + seed / 4) * 0.18;

    const volatility = Math.max((high - low) * 0.12, current * 0.0025);

    price += (target - price) * 0.08 + noise * volatility;

    if (i % 37 === 0 && i !== 0) {
      price += (Math.sin(seed + i) > 0 ? 1 : -1) * volatility * 2.8;
    }

    price = Math.max(low * 0.995, Math.min(high * 1.005, price));

    const pointDate = new Date();

if (timeframe === "1H") {
  pointDate.setMinutes(pointDate.getMinutes() - (points - i));
} else if (timeframe === "1D") {
  pointDate.setMinutes(pointDate.getMinutes() - (points - i) * 10);
} else if (timeframe === "1W") {
  pointDate.setHours(pointDate.getHours() - (points - i));
} else if (timeframe === "1M") {
  pointDate.setDate(pointDate.getDate() - (points - i));
} else if (timeframe === "1Y") {
  pointDate.setDate(pointDate.getDate() - (points - i) * 2);
} else {
  pointDate.setDate(pointDate.getDate() - (points - i) * 3);
}

data.push({
  index: i,
  price: Number(price.toFixed(2)),
  time: pointDate.toLocaleString(),
});
  }

  data[data.length - 1].price = Number(current.toFixed(2));

  return data;
}, [quote, timeframe, symbol]);

  return (
    <div className="stock-chart-wrapper">
      {/* TIMEFRAME */}
      <div className="chart-timeframes">
        {Object.keys(timeframeConfig).map((tf) => (
          <button
            key={tf}
            className={timeframe === tf ? "active" : ""}
            onClick={() => setTimeframe(tf)}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* CHART */}
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart
          data={chartData}
          onMouseMove={(e) => {
  const point = e?.activePayload?.[0]?.payload;

  if (point) {
    onHoverPrice?.(point);
  }
}}
onMouseLeave={() => onHoverPrice?.(null)}
        >
          <defs>
            <linearGradient id={`stockGradient`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6741bf" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#6741bf" stopOpacity={0} />
            </linearGradient>

            {/* 🔥 DOT PATTERN (dashboard style) */}
            <pattern
              id="dots"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="#6741bf" opacity="0.2" />
            </pattern>
          </defs>

          <XAxis dataKey="index" hide />
          <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />

          <Tooltip
            contentStyle={{
              display: "none",
            }}
          />

          {/* MAIN LINE */}
          <Area
            type="monotone"
            dataKey="price"
            stroke="#7b5ce6"
            strokeWidth={3}
            fill="url(#stockGradient)"
            dot={false}
            activeDot={{
              r: 6,
              fill: "#fff",
              stroke: "#6741bf",
              strokeWidth: 3,
            }}
          />

          {/* DOT OVERLAY */}
          <Area
            type="linear"
            dataKey="price"
            fill="url(#dots)"
            stroke="none"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default StockPriceChart;