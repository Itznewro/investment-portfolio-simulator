const axios = require("axios");

const API_KEY = process.env.FINNHUB_API_KEY;

const getQuote = async (symbol) => {
  if (!symbol) {
    throw new Error("Symbol is required");
  }

  const response = await axios.get("https://finnhub.io/api/v1/quote", {
    params: {
      symbol: symbol.toUpperCase(),
      token: API_KEY,
    },
    timeout: 10000,
  });

  const data = response.data || {};
  const current = Number(data.c) || 0;

  if (current <= 0) {
    throw new Error(`No valid live price found for ${symbol}`);
  }

  return {
    symbol: symbol.toUpperCase(),
    current,
    previousClose: Number(data.pc) || current,
    high: Number(data.h) || current,
    low: Number(data.l) || current,
    raw: data,
  };
};

module.exports = {
  getQuote,
};