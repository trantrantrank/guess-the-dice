import express from "express";
import { router } from "./routes/luckwhisper";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.use(router);

const port = process.env.PORT || 3333;
app.listen(port, () => {
    console.log(`App listening for requests on port ${port}`);
});