const STORAGE_KEY = "ips_trade_notifications";
const NOTIFIED_ORDER_KEY = "ips_notified_filled_orders";

const getUserKey = (baseKey, userId) => {
  return `${baseKey}_${userId || "guest"}`;
};

const readJson = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const getTradeNotifications = (userId) => {
  return readJson(getUserKey(STORAGE_KEY, userId), []);
};

export const saveTradeNotifications = (userId, notifications) => {
  writeJson(getUserKey(STORAGE_KEY, userId), notifications);
};

export const wasOrderNotified = (userId, orderId) => {
  if (!orderId) return false;

  const ids = readJson(getUserKey(NOTIFIED_ORDER_KEY, userId), []);
  return ids.includes(String(orderId));
};

export const markOrderNotified = (userId, orderId) => {
  if (!orderId) return;

  const key = getUserKey(NOTIFIED_ORDER_KEY, userId);
  const ids = readJson(key, []);
  const cleanId = String(orderId);

  if (!ids.includes(cleanId)) {
    writeJson(key, [...ids, cleanId]);
  }
};

export const markAllNotificationsRead = (userId) => {
  const notifications = getTradeNotifications(userId);

  const updated = notifications.map((notification) => ({
    ...notification,
    read: true,
  }));

  saveTradeNotifications(userId, updated);
  return updated;
};

export const createTradeNotification = ({
  userId,
  type = "FILLED",
  mode = "ADVANCED",
  orderId = null,
  side = "BUY",
  symbol = "",
  quantity = 0,
  price = 0,
  total = null,
  orderType = "MARKET",
  createdAt = new Date().toISOString(),
  title,
  body,
}) => {
  const cleanType = type.toUpperCase();
  const cleanSide = side?.toUpperCase() || "BUY";
  const cleanSymbol = symbol?.toUpperCase() || "STOCK";
  const cleanQuantity = Number(quantity) || 0;
  const cleanPrice = Number(price) || 0;

  const cleanTotal =
    total !== null && total !== undefined
      ? Number(total)
      : cleanQuantity * cleanPrice;

  const cleanOrderType = String(orderType || "MARKET").replaceAll("_", " ");

  if (cleanType === "FILLED" && orderId && wasOrderNotified(userId, orderId)) {
    return null;
  }

  const notification = {
    id:
      cleanType === "FILLED" && orderId
        ? `filled-${orderId}`
        : `${cleanType.toLowerCase()}-${Date.now()}`,
    userId,
    type: cleanType,
    mode: mode?.toUpperCase() === "SIMPLE" ? "SIMPLE" : "ADVANCED",
    orderId,
    side: cleanSide,
    symbol: cleanSymbol,
    quantity: cleanQuantity,
    price: cleanPrice,
    total: cleanTotal,
    orderType: cleanOrderType,
    createdAt,
    read: false,
    link: "/history",
    title:
      title ||
      (cleanType === "FILLED" ? "Your order was filled" : "Order submitted"),
    body:
      body ||
      (cleanType === "FILLED"
        ? `Your ${cleanOrderType} order to ${cleanSide.toLowerCase()} ${cleanQuantity.toFixed(
            4
          )} ${cleanSymbol} was filled at an average price of ${cleanPrice.toFixed(
            2
          )} USD.`
        : `Your ${cleanOrderType} order to ${cleanSide.toLowerCase()} ${cleanQuantity.toFixed(
            4
          )} ${cleanSymbol} is now pending.`),
  };

  const existingNotifications = getTradeNotifications(userId);

  const updatedNotifications = [notification, ...existingNotifications].slice(
    0,
    30
  );

  saveTradeNotifications(userId, updatedNotifications);

  if (cleanType === "FILLED" && orderId) {
    markOrderNotified(userId, orderId);
  }

  window.dispatchEvent(
    new CustomEvent("tradeNotificationCreated", {
      detail: notification,
    })
  );

  return notification;
};