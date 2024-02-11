"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const mainFrame_1 = require("./luckwhisper/mainFrame");
const rolling_1 = require("./luckwhisper/rolling");
const router = (0, express_1.Router)();
exports.router = router;
router.get("/luckwhisper", mainFrame_1.mainFrame);
router.post("/luckwhisper", rolling_1.goAdventure);
router.get("/_health", (req, res) => {
    res.json({ success: true });
});
