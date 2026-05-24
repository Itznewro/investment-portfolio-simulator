const pool = require("../db");
const { executeTrade } = require("../services/tradeService");

const buyStock = async (req, res) => {
  const client = await pool.connect();

  try {
    const { userId, stockSymbol, quantity, pricePerShare } = req.body;

    await client.query("BEGIN");

    const result = await executeTrade({
      client,
      userId,
      stockSymbol,
      side: "BUY",
      quantity,
      pricePerShare,
    });

    await client.query("COMMIT");

    res.status(200).json({
      message: "Stock purchased successfully",
      balance: result.balance,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Buy stock error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Server error while buying stock",
    });
  } finally {
    client.release();
  }
};

const sellStock = async (req, res) => {
  const client = await pool.connect();

  try {
    const { userId, stockSymbol, quantity, pricePerShare } = req.body;

    await client.query("BEGIN");

    const result = await executeTrade({
      client,
      userId,
      stockSymbol,
      side: "SELL",
      quantity,
      pricePerShare,
    });

    await client.query("COMMIT");

    res.status(200).json({
      message: "Stock sold successfully",
      balance: result.balance,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Sell stock error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Server error while selling stock",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  buyStock,
  sellStock,
};