const express = require("express");
const router = express.Router();
const axios = require("axios");

const API_KEY = process.env.FINNHUB_API_KEY;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const hasFinnhubCandles = (data) => {
  return (
    data?.s === "ok" &&
    Array.isArray(data.c) &&
    Array.isArray(data.t) &&
    data.c.length > 0 &&
    data.t.length > 0
  );
};

const getFinnhubCandleError = (data) => {
  if (data?.error) return data.error;
  if (data?.s && data.s !== "ok") return `Finnhub returned status ${data.s}`;
  return "Finnhub returned no candle data";
};

const getAlphaVantageError = (data) => {
  return (
    data?.["Error Message"] ||
    data?.["Information"] ||
    data?.["Note"] ||
    "Alpha Vantage returned no daily time series data"
  );
};

const alphaVantageDailyToFinnhubShape = (data) => {
  const dailySeries = data?.["Time Series (Daily)"];

  if (!dailySeries || typeof dailySeries !== "object") {
    throw new Error(getAlphaVantageError(data));
  }

  const rows = Object.entries(dailySeries)
    .map(([date, values]) => {
      const open = Number(values["1. open"]);
      const high = Number(values["2. high"]);
      const low = Number(values["3. low"]);
      const close = Number(values["4. close"]);
      const volume = Number(values["5. volume"]);
      const timestamp = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);

      if (
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close) ||
        !Number.isFinite(volume) ||
        !Number.isFinite(timestamp)
      ) {
        return null;
      }

      return {
        close,
        high,
        low,
        open,
        timestamp,
        volume,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (!rows.length) {
    throw new Error("Alpha Vantage returned no usable daily candles");
  }

  return {
    s: "ok",
    c: rows.map((row) => row.close),
    h: rows.map((row) => row.high),
    l: rows.map((row) => row.low),
    o: rows.map((row) => row.open),
    t: rows.map((row) => row.timestamp),
    v: rows.map((row) => row.volume),
  };
};

const fetchAlphaVantageDailyCandles = async (symbol) => {
  if (!ALPHA_VANTAGE_API_KEY || ALPHA_VANTAGE_API_KEY === "your_key_here") {
    throw new Error("Alpha Vantage API key is not configured");
  }

  const params = new URLSearchParams({
    function: "TIME_SERIES_DAILY",
    symbol,
    outputsize: "compact",
    apikey: ALPHA_VANTAGE_API_KEY,
  });

  const response = await fetch(
    `https://www.alphavantage.co/query?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Alpha Vantage request failed with status ${response.status}`);
  }

  const data = await response.json();
  return alphaVantageDailyToFinnhubShape(data);
};

// 🔍 Search stocks
router.get("/search", async (req, res) => {
  const query = req.query.q;

  try {
    const response = await axios.get(
      `https://finnhub.io/api/v1/search?q=${query}&token=${API_KEY}`
    );

    res.json(response.data.result.slice(0, 5)); // limit results
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Stock search failed" });
  }
});

// 💰 Get stock price
router.get("/quote/:symbol", async (req, res) => {
  const symbol = req.params.symbol;

  try {
    const response = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`
    );

    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Stock price fetch failed" });
  }
});

router.get("/profile/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;

    const response = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`
    );

    const data = await response.json();

    res.json({
      logo: data.logo || null,
      name: data.name || symbol,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching logo" });
  }
});

router.get("/market/status", async (req, res) => {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/market-status?exchange=US&token=${process.env.FINNHUB_API_KEY}`
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch market status" });
  }
});

router.get("/market/news", async (req, res) => {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${process.env.FINNHUB_API_KEY}`
    );

    const data = await response.json();
    res.json(Array.isArray(data) ? data.slice(0, 3) : []);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch market news" });
  }
});

router.get("/candles/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const normalizedSymbol = symbol.toUpperCase();
  let finnhubError = null;
  let alphaVantageError = null;

  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - 60 * 60 * 24 * 365; // last year of data

    const response = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${normalizedSymbol}&resolution=D&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`
    );

    const data = await response.json();

    if (hasFinnhubCandles(data)) {
      return res.json(data);
    }

    finnhubError = getFinnhubCandleError(data);
  } catch (error) {
    finnhubError = error.message || "Finnhub candle request failed";
    console.error("Finnhub candle error:", error);
  }

  try {
    const alphaVantageData = await fetchAlphaVantageDailyCandles(normalizedSymbol);
    return res.json(alphaVantageData);
  } catch (error) {
    alphaVantageError = error.message || "Alpha Vantage candle request failed";
    console.error("Alpha Vantage candle error:", error);
  }

  return res.status(502).json({
    error: "Historical candle data is unavailable.",
    details: {
      finnhub: finnhubError,
      alphaVantage: alphaVantageError,
    },
  });
});

module.exports = router;
