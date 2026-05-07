const express = require("express");
const router = express.Router();
const axios = require("axios");

const API_KEY = process.env.FINNHUB_API_KEY;

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
  try {
    const { symbol } = req.params;

    const to = Math.floor(Date.now() / 1000);
    const from = to - 60 * 60 * 24 * 365; // last year of data

    const response = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol.toUpperCase()}&resolution=D&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Candle error:", error);
    res.status(500).json({ message: "Failed to fetch candles" });
  }
});

module.exports = router;