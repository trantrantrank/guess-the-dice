"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainFrame = exports.generateImage = void 0;
const s_json_1 = __importDefault(require("../../images/base64/s.json"));
const canvas_1 = require("@napi-rs/canvas");
function generateImage(label) {
    return __awaiter(this, void 0, void 0, function* () {
        const width = 955;
        const height = 500;
        const canvas = (0, canvas_1.createCanvas)(width, height);
        const ctx = canvas.getContext("2d");
        function wrapText(context, text, x, y, maxWidth, lineHeight) {
            const lines = text.split("\n");
            let lastY = y;
            let lastX = x;
            lines.forEach((lineText, index) => {
                const isLastLine = index === lines.length - 1;
                let line = "";
                if (lineText.trim().length === 0) {
                    if (!isLastLine) {
                        lastY += lineHeight;
                    }
                    return;
                }
                const words = lineText.split(" ");
                words.forEach((word, n) => {
                    const testLine = line + word + " ";
                    const metrics = context.measureText(testLine);
                    const testWidth = metrics.width;
                    if (testWidth > maxWidth && n > 0) {
                        context.fillText(line, x, lastY);
                        line = word + " ";
                        lastY += lineHeight;
                        lastX = x;
                    }
                    else {
                        line = testLine;
                        lastX = x + testWidth;
                    }
                });
                context.fillText(line, x, lastY);
                if (!isLastLine) {
                    lastY += lineHeight;
                }
            });
            return { lastX, lastY };
        }
        return new Promise((resolve) => {
            function getCtx(cursorOn) {
                ctx.fillStyle = "#2d2d2d";
                ctx.fillRect(0, 0, width, height);
                ctx.font = "bold 28px Courier New";
                ctx.fillStyle = "#03A062";
                const maxWidth = width - 40;
                const lineHeight = 34;
                const x = 20;
                const y = 50;
                const { lastX, lastY } = wrapText(ctx, label, x, y, maxWidth, lineHeight);
                ctx.fillStyle = "#03A062";
                const rectHeight = 30;
                const rectWidth = 12;
                if (cursorOn) {
                    ctx.fillRect(lastX, lastY - rectHeight + 3, rectWidth, rectHeight);
                }
                return ctx;
            }
            getCtx(true);
            resolve(canvas.toBuffer("image/jpeg"));
        });
    });
}
exports.generateImage = generateImage;
function mainFrame(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const welcomeImage = s_json_1.default.welcome;
        const base64 = `data:image/gif;base64,${welcomeImage}`;
        res.setHeader("Content-Type", "text/html");
        res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
    <meta property="og:title" content="Guess the Dice">
    <meta property="og:image" content="${base64}">
    <meta name="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${base64}" />
    <meta property="fc:frame:post_url" content="https://${req.hostname}/luckwhisper?start=1">
    <meta name="fc:frame:button:1" content="Go adventure 🥷">
    </head>
    </html>
`);
    });
}
exports.mainFrame = mainFrame;
