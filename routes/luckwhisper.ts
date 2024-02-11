import { Router } from "express";
import { mainFrame } from "./luckwhisper/mainFrame";
import { goAdventure } from "./luckwhisper/rolling";

const router = Router();

router.get("/luckwhisper", mainFrame);
router.post("/luckwhisper", goAdventure);

router.get("/_health", (req, res) => {
    res.json({ success: true });
});

export { router };