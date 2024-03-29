"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const luckwhisper_1 = require("./routes/luckwhisper");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(luckwhisper_1.router);
const port = process.env.PORT || 3333;
app.listen(port, () => {
    console.log(`App listening for requests on port ${port}`);
});
