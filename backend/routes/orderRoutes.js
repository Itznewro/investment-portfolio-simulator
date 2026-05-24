const express = require("express");
const router = express.Router();

const {
  createOrder,
  getUserOrders,
  cancelOrder,
  processOrdersNow,
} = require("../controllers/orderController");

router.post("/", createOrder);
router.get("/user/:userId", getUserOrders);
router.patch("/:orderId/cancel", cancelOrder);
router.post("/process/run", processOrdersNow);

module.exports = router;