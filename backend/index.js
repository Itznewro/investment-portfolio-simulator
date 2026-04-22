const express = require("express");
const cors = require("cors");
require("dotenv").config();


const authRoutes = require("./routes/authRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");

const app = express();

app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
  res.send("Backend API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/portfolio", portfolioRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  require("dotenv").config();

const stockRoutes = require("./routes/stockRoutes");

app.use("/api/stocks", stockRoutes);
});