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

async function start() {
  await mongoose.connect(process.env.MONGO_URI!);
  app.listen(3000, () => {
    console.log("Server listening on http://localhost:3000");
  });
}
start().catch((err) => {
  console.error("start error", err);
});
