const pool = require("../db");

const getUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    let settingsResult = await pool.query(
      "SELECT * FROM user_settings WHERE user_id = $1",
      [userId]
    );

    if (settingsResult.rows.length === 0) {
      settingsResult = await pool.query(
        `INSERT INTO user_settings 
         (user_id, default_trade_mode, risk_mode, price_alerts, market_news, portfolio_updates, profile_image)
         VALUES ($1, 'BUY', 'balanced', true, true, true, NULL)
         RETURNING *`,
        [userId]
      );
    }

    const settings = settingsResult.rows[0];

    res.status(200).json({
      defaultTradeMode: settings.default_trade_mode,
      riskMode: settings.risk_mode,
      priceAlerts: settings.price_alerts,
      marketNews: settings.market_news,
      portfolioUpdates: settings.portfolio_updates,
      profileImage: settings.profile_image || null,
    });
  } catch (error) {
    console.error("Get settings error:", error);

    res.status(500).json({
      message: "Failed to fetch settings",
      error: error.message,
    });
  }
};

const updateUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      defaultTradeMode,
      riskMode,
      priceAlerts,
      marketNews,
      portfolioUpdates,
      profileImage,
    } = req.body;

    const allowedTradeModes = ["BUY", "SELL"];
    const allowedRiskModes = ["safe", "balanced", "aggressive"];

    if (!allowedTradeModes.includes(defaultTradeMode)) {
      return res.status(400).json({ message: "Invalid trade mode" });
    }

    if (!allowedRiskModes.includes(riskMode)) {
      return res.status(400).json({ message: "Invalid risk mode" });
    }

    const updatedResult = await pool.query(
      `INSERT INTO user_settings 
       (user_id, default_trade_mode, risk_mode, price_alerts, market_news, portfolio_updates, profile_image)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id)
       DO UPDATE SET
         default_trade_mode = EXCLUDED.default_trade_mode,
         risk_mode = EXCLUDED.risk_mode,
         price_alerts = EXCLUDED.price_alerts,
         market_news = EXCLUDED.market_news,
         portfolio_updates = EXCLUDED.portfolio_updates,
         profile_image = EXCLUDED.profile_image,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        userId,
        defaultTradeMode,
        riskMode,
        Boolean(priceAlerts),
        Boolean(marketNews),
        Boolean(portfolioUpdates),
        profileImage || null,
      ]
    );

    const settings = updatedResult.rows[0];

    res.status(200).json({
      message: "Settings updated successfully",
      settings: {
        defaultTradeMode: settings.default_trade_mode,
        riskMode: settings.risk_mode,
        priceAlerts: settings.price_alerts,
        marketNews: settings.market_news,
        portfolioUpdates: settings.portfolio_updates,
        profileImage: settings.profile_image || null,
      },
    });
  } catch (error) {
    console.error("Update settings error:", error);

    res.status(500).json({
      message: "Failed to update settings",
      error: error.message,
    });
  }
};

module.exports = {
  getUserSettings,
  updateUserSettings,
};