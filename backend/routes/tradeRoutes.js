const express = require("express");
const router = express.Router();
const { buyStock, sellStock } = require("../controllers/tradeController");

router.post("/buy", buyStock);
router.post("/sell", sellStock);

module.exports = router;