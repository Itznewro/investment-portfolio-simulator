const pool = require("../db");
const { getQuote } = require("../services/marketDataService");
const { executeTrade } = require("../services/tradeService");
const {
  processPendingOrders,
  createExitOrdersIfNeeded,
} = require("../services/orderEngine");

const numberOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const getExpiry = (timeInForce, gtdDate) => {
  if (timeInForce === "GTC") return null;

  if (timeInForce === "GTD" && gtdDate) {
    return new Date(gtdDate);
  }

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
};

const createOrder = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      userId,
      stockSymbol,
      side,
      sessionType,
      orderType,
      timeInForce,
      quantity,
      limitPrice,
      stopPrice,
      triggerPrice,
      takeProfitPrice,
      stopLossPrice,
      trailingType,
      trailingValue,
      gtdDate,
      algorithmTotalSlices,
      algorithmParticipation,
    } = req.body;

    const qty = Number(quantity);
    const symbol = stockSymbol?.toUpperCase();
    const tradeSide = side?.toUpperCase();
    const type = orderType?.toUpperCase();

    if (!userId || !symbol || !tradeSide || !type || qty <= 0) {
      return res.status(400).json({ message: "Missing or invalid order input" });
    }

    const quote = await getQuote(symbol);

    await client.query("BEGIN");

    const portfolioResult = await client.query(
      "SELECT id FROM portfolios WHERE user_id = $1",
      [userId]
    );

    if (portfolioResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Portfolio not found" });
    }

    const portfolioId = portfolioResult.rows[0].id;
    const expiresAt = getExpiry(timeInForce || "DAY", gtdDate);

    if (type === "MARKET") {
      const tradeResult = await executeTrade({
        client,
        userId,
        stockSymbol: symbol,
        side: tradeSide,
        quantity: qty,
        pricePerShare: quote.current,
      });

      const orderResult = await client.query(
        `INSERT INTO open_orders
         (user_id, portfolio_id, stock_symbol, side, mode, session_type, order_type,
          time_in_force, quantity, remaining_quantity, filled_quantity,
          take_profit_price, stop_loss_price, status, filled_price, filled_at, expires_at)
         VALUES
         ($1, $2, $3, $4, 'ADVANCED', $5, $6,
          $7, $8, 0, $8,
          $9, $10, 'FILLED', $11, CURRENT_TIMESTAMP, $12)
         RETURNING *`,
        [
          userId,
          portfolioId,
          symbol,
          tradeSide,
          sessionType || "RTH_PLUS_PRE_POST",
          type,
          timeInForce || "DAY",
          qty,
          numberOrNull(takeProfitPrice),
          numberOrNull(stopLossPrice),
          quote.current,
          expiresAt,
        ]
      );

      await createExitOrdersIfNeeded(client, orderResult.rows[0], qty);

      await client.query("COMMIT");

      return res.status(201).json({
        message: "Market order filled successfully",
        order: orderResult.rows[0],
        trade: tradeResult,
      });
    }

    const orderResult = await client.query(
      `INSERT INTO open_orders
       (user_id, portfolio_id, stock_symbol, side, mode, session_type, order_type,
        time_in_force, quantity, remaining_quantity,
        limit_price, stop_price, trigger_price,
        take_profit_price, stop_loss_price,
        trailing_type, trailing_value, trail_high, trail_low,
        algorithm_total_slices, algorithm_participation,
        status, expires_at)
       VALUES
       ($1, $2, $3, $4, 'ADVANCED', $5, $6,
        $7, $8, $8,
        $9, $10, $11,
        $12, $13,
        $14, $15, $16, $17,
        $18, $19,
        'PENDING', $20)
       RETURNING *`,
      [
        userId,
        portfolioId,
        symbol,
        tradeSide,
        sessionType || "RTH_PLUS_PRE_POST",
        type,
        timeInForce || "DAY",
        qty,
        numberOrNull(limitPrice),
        numberOrNull(stopPrice),
        numberOrNull(triggerPrice),
        numberOrNull(takeProfitPrice),
        numberOrNull(stopLossPrice),
        trailingType || null,
        numberOrNull(trailingValue),
        type.includes("TRAILING") ? quote.current : null,
        type.includes("TRAILING") ? quote.current : null,
        Number(algorithmTotalSlices) || 1,
        Number(algorithmParticipation) || null,
        expiresAt,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Advanced order created successfully",
      order: orderResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create order error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to create advanced order",
    });
  } finally {
    client.release();
  }
};

const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM open_orders
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.body;

    const result = await pool.query(
      `UPDATE open_orders
       SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND user_id = $2
         AND status = 'PENDING'
       RETURNING *`,
      [orderId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Pending order not found or already completed",
      });
    }

    res.json({
      message: "Order cancelled successfully",
      order: result.rows[0],
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ message: "Failed to cancel order" });
  }
};

const processOrdersNow = async (req, res) => {
  try {
    await processPendingOrders();
    res.json({ message: "Order engine processed pending orders" });
  } catch (error) {
    console.error("Manual process error:", error);
    res.status(500).json({ message: "Failed to process orders" });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  cancelOrder,
  processOrdersNow,
};