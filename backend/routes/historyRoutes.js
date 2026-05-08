const express = require("express");
const router = express.Router();
const axios = require("axios");
const pool = require("../db");

const API_KEY = process.env.FINNHUB_API_KEY;
const SNAPSHOT_COOLDOWN_MINUTES = 10;

const getLiveStockPrice = async (symbol) => {
  try {
    const response = await axios.get("https://finnhub.io/api/v1/quote", {
      params: {
        symbol: symbol.toUpperCase(),
        token: API_KEY,
      },
      timeout: 10000,
    });

    return Number(response.data?.c) || 0;
  } catch (error) {
    console.error(`Price fetch failed for ${symbol}:`, error.message);
    return 0;
  }
};

// Existing route: fetch chart history
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const portfolioResult = await pool.query(
      "SELECT id FROM portfolios WHERE user_id = $1",
      [userId]
    );

    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    const portfolioId = portfolioResult.rows[0].id;

    const historyResult = await pool.query(
      `SELECT portfolio_value, cash_balance, created_at
       FROM portfolio_history
       WHERE portfolio_id = $1
       ORDER BY created_at ASC`,
      [portfolioId]
    );

    res.json(historyResult.rows);
  } catch (error) {
    console.error("History fetch error:", error);
    res.status(500).json({ message: "Failed to fetch portfolio history" });
  }
});

// New route: save live snapshot while user is online
router.post("/snapshot/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!API_KEY) {
      return res.status(500).json({
        message: "FINNHUB_API_KEY is missing in .env",
      });
    }

    const portfolioResult = await pool.query(
      "SELECT id, cash_balance FROM portfolios WHERE user_id = $1",
      [userId]
    );

    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    const portfolio = portfolioResult.rows[0];
    const cashBalance = Number(portfolio.cash_balance) || 0;

    // Stop duplicate snapshots every few seconds
    const recentSnapshot = await pool.query(
      `SELECT id, portfolio_value, cash_balance, created_at
       FROM portfolio_history
       WHERE portfolio_id = $1
       AND created_at >= NOW() - ($2::interval)
       ORDER BY created_at DESC
       LIMIT 1`,
      [portfolio.id, `${SNAPSHOT_COOLDOWN_MINUTES} minutes`]
    );

    if (recentSnapshot.rows.length > 0) {
      return res.json({
        message: "Recent snapshot already exists. Skipped duplicate save.",
        snapshot: recentSnapshot.rows[0],
      });
    }

    const holdingsResult = await pool.query(
      `SELECT stock_symbol, quantity, average_buy_price
       FROM holdings
       WHERE portfolio_id = $1`,
      [portfolio.id]
    );

    let holdingsMarketValue = 0;

    for (const holding of holdingsResult.rows) {
      const quantity = Number(holding.quantity) || 0;

      const livePrice = await getLiveStockPrice(holding.stock_symbol);

      // If Finnhub fails, fallback to average buy price
      const fallbackPrice = Number(holding.average_buy_price) || 0;
      const priceForCalculation = livePrice > 0 ? livePrice : fallbackPrice;

      holdingsMarketValue += quantity * priceForCalculation;
    }

    const portfolioValue = cashBalance + holdingsMarketValue;

    const insertedSnapshot = await pool.query(
      `INSERT INTO portfolio_history 
       (portfolio_id, portfolio_value, cash_balance)
       VALUES ($1, $2, $3)
       RETURNING portfolio_value, cash_balance, created_at`,
      [portfolio.id, portfolioValue, cashBalance]
    );

    res.status(201).json({
      message: "Portfolio snapshot saved successfully",
      snapshot: insertedSnapshot.rows[0],
    });
  } catch (error) {
    console.error("Snapshot save error:", error);
    res.status(500).json({
      message: "Failed to save portfolio snapshot",
    });
  }
});

module.exports = router;