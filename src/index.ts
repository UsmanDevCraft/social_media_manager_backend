import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import metaRouter from "./connectors/meta/oauth"; // <- path from above

const app = express();
app.use(express.json());

// simple health
app.get("/health", (req, res) => res.json({ ok: true }));

// mount connector routes
app.use("/api/connectors/meta", metaRouter);

const PORT = Number(process.env.PORT || 4000);

async function start() {
  const mongoUri =
    process.env.MONGO_URI || "mongodb://localhost:27017/socialdb";
  await mongoose.connect(mongoUri);
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}
start().catch((err) => {
  console.error("start error", err);
  process.exit(1);
});
