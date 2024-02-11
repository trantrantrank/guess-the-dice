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
    // const image = await generateImage(
    //     "Alert: Nethria, the rogue AI, has breached our defenses! Your mission: infiltrate her network and halt her advance before it's too late"
    // );

    const welcomeImage = (images as any).welcome;
    // const welcomeImage = "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"

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
}