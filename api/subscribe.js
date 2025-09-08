// /api/subscribe.js
// Saves { email, source?, cityPreference? } to MongoDB (DB: "fomo", coll: "subscribers")

require("dotenv").config();
const { MongoClient } = require("mongodb");

let cached = { client: null, col: null };

function setCORS(req, res) {
  const allow = (process.env.ALLOWED_ORIGIN || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const origin = req.headers.origin;
  if (origin && allow.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function getCollection() {
  if (cached.col) return cached.col;
  if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI");

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const col = client.db("fomo").collection("subscribers");
  await col.createIndex({ email: 1 }, { unique: true }); // prevent duplicates

  cached.client = client;
  cached.col = col;
  return col;
}

module.exports = async (req, res) => {
  setCORS(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const email = String(body.email || "").toLowerCase().trim();
    const source = body.source || "landing";
    const cityPreference = body.cityPreference;

    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) return res.status(400).json({ ok: false, error: "Invalid email" });

    const col = await getCollection();

    const r = await col.updateOne(
      { email },
      { $setOnInsert: { email, createdAt: new Date() },
        $set: { source, cityPreference } },
      { upsert: true }
    );

    const alreadyExisted = r.upsertedCount === 0;
    return res.status(200).json({ ok: true, alreadyExisted });
  } catch (err) {
    if (err && err.code === 11000) {
      // duplicate key
      return res.status(200).json({ ok: true, alreadyExisted: true });
    }
    console.error(err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};
