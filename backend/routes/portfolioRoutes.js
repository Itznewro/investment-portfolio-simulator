const express = require("express");
const router = express.Router();
const {
  getPortfolioSummary,
} = require("../controllers/portfolioController");

router.get("/:userId", getPortfolioSummary);

module.exports = router;
