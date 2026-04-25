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

function Chart({ userId, portfolioValue, onHoverPoint, onLeaveChart }) {
  const [activeRange, setActiveRange] = useState("1D");
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/history/${userId}`);
        const data = await response.json();

        const formatted = Array.isArray(data)
          ? data.map((item, index) => ({
              name: index + 1,
              value: Number(item.portfolio_value),
              time: new Date(item.created_at).toLocaleString(),
            }))
          : [];

        setHistoryData(formatted);
      } catch (error) {
        console.error("Chart history error:", error);
        setHistoryData([]);
      }
    };

    if (userId) fetchHistory();
  }, [userId, portfolioValue]);

  const chartData = useMemo(() => {
    if (historyData.length > 0) {
      return [
        {
          name: "Start",
          value: 100000,
          time: "Starting Balance",
        },
        ...historyData,
      ];
    }

    return [
      {
        name: "Start",
        value: portfolioValue || 100000,
        time: "No trading history yet",
      },
    ];
  }, [historyData, portfolioValue]);

  return (
    <div className="chart-visual real-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          onMouseMove={(state) => {
            if (state && state.activeTooltipIndex !== undefined) {
              const point = chartData[state.activeTooltipIndex];
              if (point) onHoverPoint(point);
            }
          }}
          onMouseLeave={() => onLeaveChart()}
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
          <YAxis domain={["dataMin - 300", "dataMax + 300"]} hide />

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