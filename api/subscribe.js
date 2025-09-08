// api/subscribe.js
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");

// Reuse client across invocations
let client, clientPromise, indexEnsured = false;

async function getCollection() {
  if (!clientPromise) {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  const conn = await clientPromise;
  const col = conn.db("fomo").collection("subscribers");

  // Try to ensure unique index once; ignore duplicate-data/index-conflict errors
  if (!indexEnsured) {
    try {
      await col.createIndex({ email: 1 }, { unique: true, name: "uniq_email" });
    } catch (e) {
      // 11000: duplicates exist; 85: index options conflict; both can be ignored
      if (e.code !== 11000 && e.code !== 85) console.error("Index create error:", e);
    }
    indexEnsured = true;
  }
  return col;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { email, name, cityPreference, source = "waitlist" } = req.body || {};
    const e = String(email || "").toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return res.status(400).json({ ok: false, error: "Invalid email" });
    }

    const col = await getCollection();

    const result = await col.updateOne(
      { email: e },
      {
        $setOnInsert: { email: e, createdAt: new Date() },
        $set: { name, cityPreference, source }
      },
      { upsert: true }
    );

    const inserted = !!result.upsertedId;
    return res.json({
      ok: true,
      inserted,
      alreadyExisted: !inserted,
      upsertedId: result.upsertedId ?? null
    });
  } catch (err) {
    if (err && err.code === 11000) {
      // true duplicate of *this* email
      return res.json({ ok: true, inserted: false, alreadyExisted: true, reason: "dup-key" });
    }
    console.error("Subscribe error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
};
