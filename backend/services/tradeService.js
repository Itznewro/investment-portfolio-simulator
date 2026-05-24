const createTradeError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const FEE_RATE = 0.005;

const insertPortfolioHistory = async (client, portfolioId, newBalance) => {
  const holdingsResult = await client.query(
    "SELECT quantity, average_buy_price FROM holdings WHERE portfolio_id = $1",
    [portfolioId]
  );

  let holdingsValue = 0;

  for (const holding of holdingsResult.rows) {
    holdingsValue +=
      Number(holding.quantity) * Number(holding.average_buy_price);
  }

  const portfolioValue = Number(newBalance) + holdingsValue;

  await client.query(
    `INSERT INTO portfolio_history (portfolio_id, portfolio_value, cash_balance)
     VALUES ($1, $2, $3)`,
    [portfolioId, portfolioValue, newBalance]
  );
};

const executeTrade = async ({
  client,
  userId,
  stockSymbol,
  side,
  quantity,
  pricePerShare,
}) => {
  const qty = Number(quantity);
  const price = Number(pricePerShare);
  const symbol = stockSymbol.toUpperCase();
  const tradeSide = side.toUpperCase();

  if (!userId || !symbol || qty <= 0 || price <= 0) {
    throw createTradeError("Invalid trade input");
  }

  const portfolioResult = await client.query(
    "SELECT * FROM portfolios WHERE user_id = $1 FOR UPDATE",
    [userId]
  );

  if (portfolioResult.rows.length === 0) {
    throw createTradeError("Portfolio not found", 404);
  }

  const portfolio = portfolioResult.rows[0];
  const portfolioId = portfolio.id;
  const currentBalance = Number(portfolio.cash_balance);

  const subtotal = qty * price;
  const fee = subtotal * FEE_RATE;

  if (tradeSide === "BUY") {
    const totalCost = subtotal + fee;

    if (totalCost > currentBalance) {
      throw createTradeError("Insufficient balance");
    }

    const newBalance = currentBalance - totalCost;

    await client.query(
      "UPDATE portfolios SET cash_balance = $1 WHERE id = $2",
      [newBalance, portfolioId]
    );

    const holdingResult = await client.query(
      "SELECT * FROM holdings WHERE portfolio_id = $1 AND stock_symbol = $2 FOR UPDATE",
      [portfolioId, symbol]
    );

    if (holdingResult.rows.length > 0) {
      const existingHolding = holdingResult.rows[0];

      const oldQty = Number(existingHolding.quantity);
      const oldAvg = Number(existingHolding.average_buy_price);

      const newQty = oldQty + qty;
      const newAvg = (oldQty * oldAvg + qty * price) / newQty;

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
        [portfolioId, symbol, qty, price]
      );
    }

    await client.query(
      `INSERT INTO transactions
       (portfolio_id, stock_symbol, transaction_type, quantity, price_per_share, total_amount)
       VALUES ($1, $2, 'BUY', $3, $4, $5)`,
      [portfolioId, symbol, qty, price, totalCost]
    );

    await insertPortfolioHistory(client, portfolioId, newBalance);

    return {
      portfolioId,
      side: "BUY",
      quantity: qty,
      pricePerShare: price,
      fee,
      totalAmount: totalCost,
      balance: newBalance,
    };
  }

  if (tradeSide === "SELL") {
    const holdingResult = await client.query(
      "SELECT * FROM holdings WHERE portfolio_id = $1 AND stock_symbol = $2 FOR UPDATE",
      [portfolioId, symbol]
    );

    if (holdingResult.rows.length === 0) {
      throw createTradeError("No holdings for this stock");
    }

    const holding = holdingResult.rows[0];
    const currentQty = Number(holding.quantity);

    if (qty > currentQty) {
      throw createTradeError("Not enough shares to sell");
    }

    const totalReceived = subtotal - fee;
    const newBalance = currentBalance + totalReceived;

    await client.query(
      "UPDATE portfolios SET cash_balance = $1 WHERE id = $2",
      [newBalance, portfolioId]
    );

    const remainingQty = currentQty - qty;

    if (remainingQty > 0) {
      await client.query(
        "UPDATE holdings SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [remainingQty, holding.id]
      );
    } else {
      await client.query("DELETE FROM holdings WHERE id = $1", [holding.id]);
    }

    await client.query(
      `INSERT INTO transactions
       (portfolio_id, stock_symbol, transaction_type, quantity, price_per_share, total_amount)
       VALUES ($1, $2, 'SELL', $3, $4, $5)`,
      [portfolioId, symbol, qty, price, totalReceived]
    );

    await insertPortfolioHistory(client, portfolioId, newBalance);

    return {
      portfolioId,
      side: "SELL",
      quantity: qty,
      pricePerShare: price,
      fee,
      totalAmount: totalReceived,
      balance: newBalance,
    };
  }

  throw createTradeError("Invalid trade side");
};

module.exports = {
  executeTrade,
};