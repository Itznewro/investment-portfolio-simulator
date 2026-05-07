const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getUserSettings,
  updateUserSettings,
} = require("../controllers/settingsController");

router.get("/", protect, getUserSettings);
router.put("/", protect, updateUserSettings);

module.exports = router;