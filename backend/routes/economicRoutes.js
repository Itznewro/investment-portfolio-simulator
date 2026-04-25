const express = require("express");
const router = express.Router();
const axios = require("axios");

const API_KEY = process.env.FINNHUB_API_KEY;

router.get("/", async (req, res) => {
  try {
    const today = new Date();
    const from = today.toISOString().split("T")[0];

    const toDate = new Date();
    toDate.setDate(today.getDate() + 7);
    const to = toDate.toISOString().split("T")[0];

    const response = await axios.get(
      "https://finnhub.io/api/v1/calendar/economic",
      {
        params: {
          from,
          to,
          token: API_KEY,
        },
        timeout: 10000,
      }
    );

    const rawData = response.data;
    console.log("Economic API raw data:", rawData);

    let events = [];

    if (Array.isArray(rawData?.economicCalendar)) {
      events = rawData.economicCalendar;
    } else if (Array.isArray(rawData?.economicCalendar?.events)) {
      events = rawData.economicCalendar.events;
    } else if (Array.isArray(rawData?.events)) {
      events = rawData.events;
    }

    res.json(events.slice(0, 6));
  } catch (error) {
    console.error(
      "Economic events error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message: "Failed to fetch economic events",
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;