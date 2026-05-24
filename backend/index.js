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
const orderRoutes = require("./routes/orderRoutes");
const { startOrderEngine } = require("./services/orderEngine");

const app = express();

app.use(cors());


app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// Cleaner error response for large uploads
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
app.use("/api/orders", orderRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startOrderEngine();
});