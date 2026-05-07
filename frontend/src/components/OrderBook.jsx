import { useMemo, useState } from "react";

function OrderBook({ quote }) {
  const [spreadLevel, setSpreadLevel] = useState("0.01");

  const lastPrice = Number(quote?.c) || 0;
  const spread = Number(spreadLevel);

  const orderRows = useMemo(() => {
    if (!lastPrice) return { asks: [], bids: [] };

    const asks = Array.from({ length: 7 }, (_, index) => {
      const price = lastPrice + spread * (index + 1);
      const amount = Number((Math.random() * 8 + 0.2).toFixed(4));
      return {
        price,
        amount,
        total: price * amount,
      };
    }).reverse();

    const bids = Array.from({ length: 7 }, (_, index) => {
      const price = lastPrice - spread * (index + 1);
      const amount = Number((Math.random() * 8 + 0.2).toFixed(4));
      return {
        price,
        amount,
        total: price * amount,
      };
    });

    return { asks, bids };
  }, [lastPrice, spreadLevel]);

  return (
    <div className="orderbook-card">
      <div className="orderbook-header">
        <h3>Order Book</h3>

        <select
          value={spreadLevel}
          onChange={(e) => setSpreadLevel(e.target.value)}
        >
          <option value="0.01">0.01 spread</option>
          <option value="0.05">0.05 spread</option>
          <option value="0.10">0.10 spread</option>
          <option value="0.50">0.50 spread</option>
        </select>
      </div>

      <div className="orderbook-table-head">
        <span>Price</span>
        <span>Amount</span>
        <span>Total</span>
      </div>

      <div className="orderbook-asks">
        {orderRows.asks.map((row, index) => (
          <div className="orderbook-row" key={`ask-${index}`}>
            <span className="loss-text">${row.price.toFixed(2)}</span>
            <span>{row.amount.toFixed(4)}</span>
            <span>${row.total.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="orderbook-mid">
        ${lastPrice.toFixed(2)}
        <span> Last price</span>
      </div>

      <div className="orderbook-bids">
        {orderRows.bids.map((row, index) => (
          <div className="orderbook-row" key={`bid-${index}`}>
            <span className="profit-text">${row.price.toFixed(2)}</span>
            <span>{row.amount.toFixed(4)}</span>
            <span>${row.total.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrderBook;