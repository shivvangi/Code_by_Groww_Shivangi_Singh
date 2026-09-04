import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { watchlistRouter } from "./routes/watchlist.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running!" });
});

app.use("/api/watchlist", watchlistRouter);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
