const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const stockRoutes = require("./routes/stockRoutes");
const economicRoutes = require("./routes/economicRoutes");
const historyRoutes = require("./routes/historyRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

const app = express();

app.use(cors());

// Increase JSON size limit so profile pictures / GIFs can be saved as base64
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// Cleaner error response instead of ugly HTML error on frontend
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      message: "File is too large. Please upload an image under 2MB.",
    });
  }

  next(err);
});

app.get("/", (req, res) => {
  res.send("Backend API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/economic-events", economicRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/settings", settingsRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});