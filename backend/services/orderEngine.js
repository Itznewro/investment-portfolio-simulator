const crypto = require("crypto");
const pool = require("../db");
const { getQuote } = require("./marketDataService");
const { executeTrade } = require("./tradeService");

const ALGO_TYPES = ["TWAP", "VWAP", "POV"];

const numberOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const isExpired = (order) => {
  return order.expires_at && new Date(order.expires_at) <= new Date();
};

const getEasternClock = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date());

  const mapped = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    hour: Number(mapped.hour),
    minute: Number(mapped.minute),
  };
};

const isMarketCloseWindow = () => {
  const { hour, minute } = getEasternClock();
  return hour === 15 && minute >= 55;
};

const limitCanFill = (order, currentPrice) => {
  const limitPrice = Number(order.limit_price);

  if (!limitPrice) return false;

  if (order.side === "BUY") {
    return currentPrice <= limitPrice;
  }

  return currentPrice >= limitPrice;
};

const stopTouched = (order, currentPrice) => {
  const stopPrice = Number(order.stop_price);

  if (!stopPrice) return false;

  if (order.side === "BUY") {
    return currentPrice >= stopPrice;
  }

  return currentPrice <= stopPrice;
};

const triggerTouched = (order, currentPrice) => {
  const triggerPrice = Number(order.trigger_price);

  if (!triggerPrice) return false;

  if (order.side === "BUY") {
    return currentPrice <= triggerPrice;
  }

  return currentPrice >= triggerPrice;
};

const getTrailingDistance = (order, referencePrice) => {
  const value = Number(order.trailing_value);

  if (!value) return null;

  if (order.trailing_type === "PERCENT") {
    return referencePrice * (value / 100);
  }

  return value;
};

const trailingTriggered = async (client, order, currentPrice) => {
  const side = order.side;

  let trailHigh = Number(order.trail_high) || currentPrice;
  let trailLow = Number(order.trail_low) || currentPrice;

  if (side === "SELL") {
    trailHigh = Math.max(trailHigh, currentPrice);

    const distance = getTrailingDistance(order, trailHigh);
    if (!distance) return false;

    const stopLine = trailHigh - distance;

    await client.query(
      `UPDATE open_orders
       SET trail_high = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [trailHigh, order.id]
    );

    return currentPrice <= stopLine;
  }

  trailLow = Math.min(trailLow, currentPrice);

  const distance = getTrailingDistance(order, trailLow);
  if (!distance) return false;

  const stopLine = trailLow + distance;

  await client.query(
    `UPDATE open_orders
     SET trail_low = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [trailLow, order.id]
  );

  return currentPrice >= stopLine;
};

const shouldOrderFill = async (client, order, currentPrice) => {
  switch (order.order_type) {
    case "MARKET":
      return true;

    case "LIMIT":
      return limitCanFill(order, currentPrice);

    case "STOP":
      return stopTouched(order, currentPrice);

    case "STOP_LIMIT": {
      const alreadyTriggered = order.stop_triggered === true;

      if (!alreadyTriggered && stopTouched(order, currentPrice)) {
        await client.query(
          `UPDATE open_orders
           SET stop_triggered = TRUE, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [order.id]
        );

        return limitCanFill(order, currentPrice);
      }

      return alreadyTriggered && limitCanFill(order, currentPrice);
    }

    case "LIT": {
      const alreadyTriggered = order.stop_triggered === true;

      if (!alreadyTriggered && triggerTouched(order, currentPrice)) {
        await client.query(
          `UPDATE open_orders
           SET stop_triggered = TRUE, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [order.id]
        );

        return limitCanFill(order, currentPrice);
      }

      return alreadyTriggered && limitCanFill(order, currentPrice);
    }

    case "MIT":
      return triggerTouched(order, currentPrice);

    case "TRAILING_STOP":
      return trailingTriggered(client, order, currentPrice);

    case "TRAILING_STOP_LIMIT": {
      const alreadyTriggered = order.stop_triggered === true;

      if (!alreadyTriggered) {
        const triggered = await trailingTriggered(client, order, currentPrice);

        if (triggered) {
          await client.query(
            `UPDATE open_orders
             SET stop_triggered = TRUE, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [order.id]
          );
        }

        return triggered && limitCanFill(order, currentPrice);
      }

      return limitCanFill(order, currentPrice);
    }

    case "MOC":
      return isMarketCloseWindow();

    case "TWAP":
    case "VWAP":
    case "POV":
      return true;

    default:
      return false;
  }
};

const calculateFillQuantity = (order) => {
  const remaining = Number(order.remaining_quantity);

  if (!ALGO_TYPES.includes(order.order_type)) {
    return remaining;
  }

  const totalSlices = Number(order.algorithm_total_slices) || 5;
  const filledSlices = Number(order.algorithm_filled_slices) || 0;
  const remainingSlices = Math.max(totalSlices - filledSlices, 1);

  return Math.min(remaining, remaining / remainingSlices);
};

const cancelOcoSiblings = async (client, order) => {
  if (!order.oco_group_id || !order.parent_order_id) return;

  await client.query(
    `UPDATE open_orders
     SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
     WHERE oco_group_id = $1
       AND id <> $2
       AND status = 'PENDING'`,
    [order.oco_group_id, order.id]
  );
};

const createExitOrdersIfNeeded = async (client, parentOrder, filledQuantity) => {
  if (parentOrder.side !== "BUY") return;

  const takeProfitPrice = numberOrNull(parentOrder.take_profit_price);
  const stopLossPrice = numberOrNull(parentOrder.stop_loss_price);

  if (!takeProfitPrice && !stopLossPrice) return;

  const ocoGroupId = crypto.randomUUID();

  if (takeProfitPrice) {
    await client.query(
      `INSERT INTO open_orders
       (user_id, portfolio_id, parent_order_id, oco_group_id, stock_symbol, side,
        mode, session_type, order_type, time_in_force, quantity, remaining_quantity,
        limit_price, status)
       VALUES
       ($1, $2, $3, $4, $5, 'SELL',
        'ADVANCED', $6, 'LIMIT', 'GTC', $7, $7,
        $8, 'PENDING')`,
      [
        parentOrder.user_id,
        parentOrder.portfolio_id,
        parentOrder.id,
        ocoGroupId,
        parentOrder.stock_symbol,
        parentOrder.session_type,
        filledQuantity,
        takeProfitPrice,
      ]
    );
  }

  if (stopLossPrice) {
    await client.query(
      `INSERT INTO open_orders
       (user_id, portfolio_id, parent_order_id, oco_group_id, stock_symbol, side,
        mode, session_type, order_type, time_in_force, quantity, remaining_quantity,
        stop_price, status)
       VALUES
       ($1, $2, $3, $4, $5, 'SELL',
        'ADVANCED', $6, 'STOP', 'GTC', $7, $7,
        $8, 'PENDING')`,
      [
        parentOrder.user_id,
        parentOrder.portfolio_id,
        parentOrder.id,
        ocoGroupId,
        parentOrder.stock_symbol,
        parentOrder.session_type,
        filledQuantity,
        stopLossPrice,
      ]
    );
  }
};

const rejectOrder = async (orderId, reason) => {
  await pool.query(
    `UPDATE open_orders
     SET status = 'REJECTED',
         reject_reason = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [reason, orderId]
  );
};

const processSingleOrder = async (order, quote) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const lockedResult = await client.query(
      "SELECT * FROM open_orders WHERE id = $1 AND status = 'PENDING' FOR UPDATE",
      [order.id]
    );

    if (lockedResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return;
    }

    const lockedOrder = lockedResult.rows[0];

    if (isExpired(lockedOrder)) {
      await client.query(
        `UPDATE open_orders
         SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [lockedOrder.id]
      );

      await client.query("COMMIT");
      return;
    }

    const currentPrice = Number(quote.current);
    const canFill = await shouldOrderFill(client, lockedOrder, currentPrice);

    if (!canFill) {
      await client.query("COMMIT");
      return;
    }

    const fillQuantity = calculateFillQuantity(lockedOrder);
    const remainingBefore = Number(lockedOrder.remaining_quantity);
    const remainingAfter = Math.max(remainingBefore - fillQuantity, 0);
    const finalStatus = remainingAfter <= 0.000001 ? "FILLED" : "PENDING";
    const isAlgoOrder = ALGO_TYPES.includes(lockedOrder.order_type);

    await executeTrade({
      client,
      userId: lockedOrder.user_id,
      stockSymbol: lockedOrder.stock_symbol,
      side: lockedOrder.side,
      quantity: fillQuantity,
      pricePerShare: currentPrice,
    });

    await client.query(
      `UPDATE open_orders
       SET remaining_quantity = $1,
           filled_quantity = COALESCE(filled_quantity, 0) + $2,
           filled_price = $3,
           status = $4,
           algorithm_filled_slices = algorithm_filled_slices + $5,
           filled_at = CASE WHEN $4 = 'FILLED' THEN CURRENT_TIMESTAMP ELSE filled_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [
        remainingAfter,
        fillQuantity,
        currentPrice,
        finalStatus,
        isAlgoOrder ? 1 : 0,
        lockedOrder.id,
      ]
    );

    if (finalStatus === "FILLED") {
      const completedOrder = {
        ...lockedOrder,
        filled_price: currentPrice,
        status: "FILLED",
      };

      await createExitOrdersIfNeeded(
        client,
        completedOrder,
        Number(lockedOrder.quantity)
      );

      await cancelOcoSiblings(client, lockedOrder);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Order engine error:", error);
    await rejectOrder(order.id, error.message || "Order processing failed");
  } finally {
    client.release();
  }
};

const processPendingOrders = async () => {
  const pendingResult = await pool.query(
    `SELECT *
     FROM open_orders
     WHERE status = 'PENDING'
     ORDER BY created_at ASC
     LIMIT 50`
  );

  const quoteCache = {};

  for (const order of pendingResult.rows) {
    try {
      if (!quoteCache[order.stock_symbol]) {
        quoteCache[order.stock_symbol] = await getQuote(order.stock_symbol);
      }

      await processSingleOrder(order, quoteCache[order.stock_symbol]);
    } catch (error) {
      console.error(`Failed processing order ${order.id}:`, error.message);
      await rejectOrder(order.id, error.message);
    }
  }
};

const startOrderEngine = () => {
  console.log("Advanced order engine started");

  setInterval(() => {
    processPendingOrders().catch((error) => {
      console.error("Order engine loop error:", error);
    });
  }, 30000);
};

module.exports = {
  startOrderEngine,
  processPendingOrders,
  createExitOrdersIfNeeded,
};