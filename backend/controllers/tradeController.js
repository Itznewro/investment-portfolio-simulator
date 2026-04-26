const pool = require("../db");

const buyStock = async (req, res) => {
  const client = await pool.connect();

  try {
    const { userId, stockSymbol, quantity, pricePerShare } = req.body;

    if (!userId || !stockSymbol || !quantity || !pricePerShare) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const qty = Number(quantity);
    const price = Number(pricePerShare);

    if (qty <= 0 || price <= 0) {
      return res.status(400).json({ message: "Quantity and price must be greater than 0" });
    }

    const feeRate = 0.005;
    const subtotal = qty * price;
    const fee = subtotal * feeRate;
    const totalCost = subtotal + fee;

    await client.query("BEGIN");

    const portfolioResult = await client.query(
      "SELECT * FROM portfolios WHERE user_id = $1 FOR UPDATE",
      [userId]
    );

    if (portfolioResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Portfolio not found" });
    }

    const portfolio = portfolioResult.rows[0];
    const currentBalance = Number(portfolio.cash_balance);

    if (totalCost > currentBalance) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const newBalance = currentBalance - totalCost;

    await client.query(
      "UPDATE portfolios SET cash_balance = $1 WHERE id = $2",
      [newBalance, portfolio.id]
    );

    const holdingResult = await client.query(
      "SELECT * FROM holdings WHERE portfolio_id = $1 AND stock_symbol = $2 FOR UPDATE",
      [portfolio.id, stockSymbol.toUpperCase()]
    );

    if (holdingResult.rows.length > 0) {
      const existingHolding = holdingResult.rows[0];
      const oldQty = Number(existingHolding.quantity);
      const oldAvg = Number(existingHolding.average_buy_price);

      const newQty = oldQty + qty;
      const newAvg =
        ((oldQty * oldAvg) + (qty * price)) / newQty;

      await client.query(
        `UPDATE holdings
         SET quantity = $1, average_buy_price = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [newQty, newAvg, existingHolding.id]
      );
    } else {
      await client.query(
        `INSERT INTO holdings (portfolio_id, stock_symbol, quantity, average_buy_price)
         VALUES ($1, $2, $3, $4)`,
        [portfolio.id, stockSymbol.toUpperCase(), qty, price]
      );
    }

    await client.query(
      `INSERT INTO transactions
       (portfolio_id, stock_symbol, transaction_type, quantity, price_per_share, total_amount)
       VALUES ($1, $2, 'BUY', $3, $4, $5)`,
      [portfolio.id, stockSymbol.toUpperCase(), qty, price, totalCost]
    );

    const holdingsAfterBuy = await client.query(
  "SELECT quantity, average_buy_price FROM holdings WHERE portfolio_id = $1",
  [portfolio.id]
);

let holdingsValue = 0;

for (const holding of holdingsAfterBuy.rows) {
  holdingsValue += Number(holding.quantity) * Number(holding.average_buy_price);
}

const portfolioValue = newBalance + holdingsValue;

await client.query(
  `INSERT INTO portfolio_history (portfolio_id, portfolio_value, cash_balance)
   VALUES ($1, $2, $3)`,
  [portfolio.id, portfolioValue, newBalance]
);

    await client.query("COMMIT");

    res.status(200).json({
      message: "Stock purchased successfully",
      balance: newBalance,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Buy stock error:", error);
    res.status(500).json({ message: "Server error while buying stock" });
  } finally {
    client.release();
  }
};

module.exports = { buyStock };

const sellStock = async (req, res) => {
  const client = await pool.connect();

  try {
    const { userId, stockSymbol, quantity, pricePerShare } = req.body;

    const qty = Number(quantity);
    const price = Number(pricePerShare);

    if (!userId || !stockSymbol || qty <= 0 || price <= 0) {
      return res.status(400).json({ message: "Invalid input" });
    }

    await client.query("BEGIN");

    const portfolioResult = await client.query(
      "SELECT * FROM portfolios WHERE user_id = $1 FOR UPDATE",
      [userId]
    );

    if (portfolioResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Portfolio not found" });
    }

    const portfolio = portfolioResult.rows[0];

    const holdingResult = await client.query(
      "SELECT * FROM holdings WHERE portfolio_id = $1 AND stock_symbol = $2 FOR UPDATE",
      [portfolio.id, stockSymbol.toUpperCase()]
    );

    if (holdingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "No holdings for this stock" });
    }

    const holding = holdingResult.rows[0];
    const currentQty = Number(holding.quantity);

    if (qty > currentQty) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Not enough shares to sell" });
    }

    const feeRate = 0.005;
    const subtotal = qty * price;
    const fee = subtotal * feeRate;
    const totalReceived = subtotal - fee;

    const newBalance =
      Number(portfolio.cash_balance) + totalReceived;

    await client.query(
      "UPDATE portfolios SET cash_balance = $1 WHERE id = $2",
      [newBalance, portfolio.id]
    );

    const remainingQty = currentQty - qty;

    if (remainingQty > 0) {
      await client.query(
        "UPDATE holdings SET quantity = $1 WHERE id = $2",
        [remainingQty, holding.id]
      );
    } else {
      await client.query(
        "DELETE FROM holdings WHERE id = $1",
        [holding.id]
      );
    }

    await client.query(
      `INSERT INTO transactions
       (portfolio_id, stock_symbol, transaction_type, quantity, price_per_share, total_amount)
       VALUES ($1, $2, 'SELL', $3, $4, $5)`,
      [portfolio.id, stockSymbol.toUpperCase(), qty, price, totalReceived]
    );

    const holdingsAfterSell = await client.query(
  "SELECT quantity, average_buy_price FROM holdings WHERE portfolio_id = $1",
  [portfolio.id]
);

let holdingsValue = 0;

for (const holding of holdingsAfterSell.rows) {
  holdingsValue += Number(holding.quantity) * Number(holding.average_buy_price);
}

const portfolioValue = newBalance + holdingsValue;

await client.query(
  `INSERT INTO portfolio_history (portfolio_id, portfolio_value, cash_balance)
   VALUES ($1, $2, $3)`,
  [portfolio.id, portfolioValue, newBalance]
);

    await client.query("COMMIT");

    res.json({
      message: "Stock sold successfully",
      balance: newBalance,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Sell error:", error);
    res.status(500).json({ message: "Sell failed" });
  } finally {
    client.release();
  }
};

module.exports = { buyStock, sellStock };

