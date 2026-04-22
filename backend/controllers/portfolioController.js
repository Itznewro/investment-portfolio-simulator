const pool = require("../db");

const getPortfolioSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    const portfolioResult = await pool.query(
      "SELECT * FROM portfolios WHERE user_id = $1",
      [userId]
    );

    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    const portfolio = portfolioResult.rows[0];

    const holdingsResult = await pool.query(
      "SELECT * FROM holdings WHERE portfolio_id = $1",
      [portfolio.id]
    );

    const transactionsResult = await pool.query(
      "SELECT * FROM transactions WHERE portfolio_id = $1 ORDER BY created_at DESC",
      [portfolio.id]
    );

    res.status(200).json({
      portfolio: {
        id: portfolio.id,
        userId: portfolio.user_id,
        cashBalance: portfolio.cash_balance,
      },
      holdings: holdingsResult.rows,
      transactions: transactionsResult.rows,
    });
  } catch (error) {
    console.error("Portfolio summary error:", error);
    res.status(500).json({ message: "Server error fetching portfolio" });
  }
};

module.exports = {
  getPortfolioSummary,
};