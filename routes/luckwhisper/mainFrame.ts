import { Request, Response } from "express";
import images from "../../images/base64/s.json"
import { createCanvas } from "@napi-rs/canvas";

export async function generateImage(label: string): Promise<Buffer> {
    const width = 955;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    function wrapText(
        context: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number
    ): { lastX: number; lastY: number } {
        const lines = text.split("\n");
        let lastY = y;
        let lastX = x;

        lines.forEach((lineText, index) => {
            const isLastLine = index === lines.length - 1;
            let line = "";

            if (lineText.trim().length === 0) {
                if (!isLastLine) {
                    // Only increment Y for non-empty lines except the last
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
                } else {
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
        function getCtx(cursorOn?: boolean): CanvasRenderingContext2D {
            ctx.fillStyle = "#2d2d2d";
            ctx.fillRect(0, 0, width, height);
            ctx.font = "bold 28px Courier New";
            ctx.fillStyle = "#03A062";

            const maxWidth = width - 40;
            const lineHeight = 34;
            const x = 20;
            const y = 50;
            const { lastX, lastY } = wrapText(
                ctx as any,
                label,
                x,
                y,
                maxWidth,
                lineHeight
            );

            ctx.fillStyle = "#03A062";
            const rectHeight = 30;
            const rectWidth = 12;
            if (cursorOn) {
                ctx.fillRect(lastX, lastY - rectHeight + 3, rectWidth, rectHeight);
            }
            return ctx as any;
        }

        getCtx(true);

        resolve(canvas.toBuffer("image/jpeg"));
    });
}

export async function mainFrame(req: Request, res: Response) {
    const welcomeImage = (images as any).welcome;

    const base64 = `data:image/avif;base64,${welcomeImage}`;
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
    <meta property="og:title" content="Guess the Dice!">
    <meta property="og:image" content="${base64}">
    <meta name="fc:frame" content="vNext">
    <meta property="fc:frame:image" content="${base64}" />
    <meta property="fc:frame:post_url" content="https://${req.hostname}/luckwhisper?start=1">
    <meta name="fc:frame:button:1" content="Go adventure 🥷">
    </head>
    </html>
`);
}