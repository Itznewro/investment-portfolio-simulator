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

module.exports = router;