const express = require("express");
const router = express.Router();
const pool = require("../db");

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

module.exports = router;