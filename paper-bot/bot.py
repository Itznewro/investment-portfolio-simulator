import os
import time
import requests
import yfinance as yf
import pandas as pd
from ta.momentum import RSIIndicator
from ta.trend import SMAIndicator
from dotenv import load_dotenv

load_dotenv()

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000")
USER_ID = int(os.getenv("USER_ID", "1"))

WATCHLIST = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"]

TRADE_AMOUNT = 1000
RSI_BUY_LEVEL = 35
RSI_SELL_LEVEL = 70

# Testing mode: every 30 seconds
# Later you can change this to 60 * 15
CHECK_INTERVAL = 30


def to_float(value):
    """
    Safely converts yfinance / pandas values into normal Python float.
    Fixes errors where value comes as Series or single-cell DataFrame.
    """
    if isinstance(value, pd.Series):
        return float(value.iloc[0])

    if isinstance(value, pd.DataFrame):
        return float(value.iloc[0, 0])

    return float(value)


def get_market_data(symbol):
    data = yf.download(
        symbol,
        period="3mo",
        interval="1d",
        progress=False,
        auto_adjust=False
    )

    if data.empty:
        return None

    # Fix multi-index columns from yfinance
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)

    data = data.dropna()

    close = data["Close"]

    if isinstance(close, pd.DataFrame):
        close = close.iloc[:, 0]

    close = close.squeeze()

    data["rsi"] = RSIIndicator(close=close, window=14).rsi()
    data["sma20"] = SMAIndicator(close=close, window=20).sma_indicator()
    data["sma50"] = SMAIndicator(close=close, window=50).sma_indicator()

    return data


def get_signal(symbol):
    data = get_market_data(symbol)

    if data is None or len(data) < 50:
        return "HOLD", None

    latest = data.iloc[-1]

    price = to_float(latest["Close"])
    rsi = to_float(latest["rsi"])
    sma20 = to_float(latest["sma20"])
    sma50 = to_float(latest["sma50"])

    print(
        f"{symbol} | Price: ${price:.2f} | "
        f"RSI: {rsi:.2f} | SMA20: {sma20:.2f} | SMA50: {sma50:.2f}"
    )

    if rsi < RSI_BUY_LEVEL and sma20 > sma50:
        return "BUY", price

    if rsi > RSI_SELL_LEVEL:
        return "SELL", price

    return "HOLD", price


def get_portfolio():
    response = requests.get(
        f"{API_BASE_URL}/api/portfolio/{USER_ID}",
        timeout=10
    )
    response.raise_for_status()
    return response.json()


def get_cash_balance():
    portfolio = get_portfolio()
    cash_balance = portfolio.get("portfolio", {}).get("cashBalance", 0)
    return float(cash_balance)


def get_holding_quantity(symbol):
    portfolio = get_portfolio()
    holdings = portfolio.get("holdings", [])

    for holding in holdings:
        if holding["stock_symbol"].upper() == symbol.upper():
            return float(holding["quantity"])

    return 0


def send_order(symbol, side, price):
    if price is None or price <= 0:
        print(f"Invalid price for {symbol}. Order skipped.")
        return

    if side == "BUY":
        cash_balance = get_cash_balance()

        if cash_balance < TRADE_AMOUNT:
            print(f"Not enough cash to buy {symbol}. Cash: ${cash_balance:.2f}")
            return

        quantity = TRADE_AMOUNT / price
        endpoint = "/api/trade/buy"

    elif side == "SELL":
        owned_quantity = get_holding_quantity(symbol)

        if owned_quantity <= 0:
            print(f"No {symbol} shares to sell.")
            return

        quantity = owned_quantity
        endpoint = "/api/trade/sell"

    else:
        return

    payload = {
        "userId": USER_ID,
        "stockSymbol": symbol,
        "quantity": round(quantity, 4),
        "pricePerShare": round(price, 2),
    }

    response = requests.post(
        f"{API_BASE_URL}{endpoint}",
        json=payload,
        timeout=10,
    )

    try:
        data = response.json()
    except Exception:
        data = {"message": response.text}

    if response.ok:
        print(f"{side} order sent for {symbol}: {data}")
    else:
        print(f"{side} order failed for {symbol}: {data}")


def run_bot_once():
    print("\nChecking market signals...")
    print("=" * 50)

    for symbol in WATCHLIST:
        try:
            signal, price = get_signal(symbol)

            if signal == "BUY":
                print(f"BUY signal found for {symbol}")
                send_order(symbol, "BUY", price)

            elif signal == "SELL":
                print(f"SELL signal found for {symbol}")
                send_order(symbol, "SELL", price)

            else:
                print(f"HOLD {symbol}")

        except Exception as error:
            print(f"Error checking {symbol}: {error}")

        print("-" * 50)


if __name__ == "__main__":
    print("Paper trading bot started...")
    print(f"Backend URL: {API_BASE_URL}")
    print(f"Trading for user ID: {USER_ID}")
    print("=" * 50)

    while True:
        run_bot_once()
        print(f"Sleeping for {CHECK_INTERVAL} seconds...")
        time.sleep(CHECK_INTERVAL)