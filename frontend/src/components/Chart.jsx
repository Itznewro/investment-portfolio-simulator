import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Area,
} from "recharts";
import { useEffect, useMemo, useState } from "react";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const RANGE_SETTINGS = {
  "1H": { durationMs: HOUR, points: 60 },
  "1D": { durationMs: DAY, stepMs: 10 * MINUTE },
  "1W": { durationMs: 7 * DAY, stepMs: 30 * MINUTE },
  "1M": { durationMs: 30 * DAY, stepMs: HOUR },
  "1Y": { durationMs: 365 * DAY, stepMs: DAY },
  All: { durationMs: 365 * DAY, stepMs: 2 * DAY },
};

function buildTimeline(range) {
  const now = Date.now();
  const settings = RANGE_SETTINGS[range] || RANGE_SETTINGS["1D"];
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
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (range === "1W" || range === "1M") {
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getFakeMovement(index, totalPoints, seed, volatility) {
  const progress = index / Math.max(totalPoints - 1, 1);
  const fade = Math.sin(Math.PI * progress);

  const wave =
    Math.sin(index * 0.8 + seed) * 0.6 +
    Math.sin(index * 1.7 + seed / 2) * 0.3 +
    Math.cos(index * 0.4 + seed / 3) * 0.2;

  return wave * volatility * fade;
}

function Chart({
  userId,
  portfolioValue,
  refreshKey = 0,
  onHoverPoint,
  onLeaveChart,
}) {
  const [activeRange, setActiveRange] = useState("1D");
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/history/${userId}`);
        const data = await response.json();

        const formatted = Array.isArray(data)
          ? data
              .map((item) => ({
                value: Number(item.portfolio_value),
                timestamp: new Date(item.created_at).getTime(),
                time: new Date(item.created_at).toLocaleString(),
              }))
              .filter(
                (item) =>
                  Number.isFinite(item.value) &&
                  Number.isFinite(item.timestamp)
              )
              .sort((a, b) => a.timestamp - b.timestamp)
          : [];

        setHistoryData(formatted);
      } catch (error) {
        console.error("Chart history error:", error);
        setHistoryData([]);
      }
    };

    if (userId) fetchHistory();
  }, [userId, portfolioValue, refreshKey]);

  const chartData = useMemo(() => {
    const currentValue =
      Number(portfolioValue) ||
      historyData[historyData.length - 1]?.value ||
      100000;

    const timeline = buildTimeline(activeRange);

    const startValue =
      historyData.length > 0
        ? historyData[0].value
        : currentValue === 100000
        ? 100000
        : 100000;

    const seed =
      activeRange.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) +
      historyData.length * 10;

    const movement = Math.abs(currentValue - startValue);
    const volatility = Math.max(movement * 0.12, currentValue * 0.002, 80);

    const data = timeline.map((date, index) => {
      const progress = index / Math.max(timeline.length - 1, 1);
      const trendValue = startValue + (currentValue - startValue) * progress;
      const fakeMovement = getFakeMovement(
        index,
        timeline.length,
        seed,
        volatility
      );

      return {
        name: index + 1,
        value: Number(Math.max(0, trendValue + fakeMovement).toFixed(2)),
        time: formatTime(date, activeRange),
        fullTime: date.toLocaleString(),
      };
    });

    if (data.length > 0) {
      data[0].value = Number(startValue.toFixed(2));
      data[data.length - 1].value = Number(currentValue.toFixed(2));
      data[data.length - 1].time = "Now";
    }

    return data;
  }, [historyData, portfolioValue, activeRange]);

  const values = chartData.map((point) => point.value);
  const minValue = values.length ? Math.min(...values) : 99900;
  const maxValue = values.length ? Math.max(...values) : 100100;
  const padding = Math.max((maxValue - minValue) * 0.18, 120);

  return (
    <div className="chart-visual real-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          onMouseMove={(state) => {
            if (state && state.activeTooltipIndex !== undefined) {
              const point = chartData[state.activeTooltipIndex];
              if (point) onHoverPoint?.(point);
            }
          }}
          onMouseLeave={() => onLeaveChart?.()}
        >
          <defs>
            <linearGradient id="portfolioLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4f8cff" />
              <stop offset="100%" stopColor="#7b5ce6" />
            </linearGradient>

            <pattern
              id="dotPattern"
              patternUnits="userSpaceOnUse"
              width="7"
              height="7"
            >
              <circle cx="2" cy="2" r="1.1" fill="#4f8cff" opacity="0.45" />
            </pattern>

            <linearGradient id="fadeMask" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity={1} />
              <stop offset="60%" stopColor="white" stopOpacity={0.55} />
              <stop offset="100%" stopColor="white" stopOpacity={0} />
            </linearGradient>

            <mask id="dotFadeMask">
              <rect width="100%" height="100%" fill="url(#fadeMask)" />
            </mask>
          </defs>

          <XAxis dataKey="name" hide />
          <YAxis domain={[minValue - padding, maxValue + padding]} hide />

          <Tooltip content={() => null} />

          <Area
            type="monotone"
            dataKey="value"
            stroke="none"
            fill="url(#dotPattern)"
            fillOpacity={1}
            mask="url(#dotFadeMask)"
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke="url(#portfolioLine)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: "#7b5ce6" }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="chart-tabs">
        {["1H", "1D", "1W", "1M", "1Y", "All"].map((range) => (
          <button
            key={range}
            className={activeRange === range ? "active" : ""}
            onClick={() => setActiveRange(range)}
          >
            {range}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Chart;