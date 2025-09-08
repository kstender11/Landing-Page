// api/subscribe.js
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Missing MONGODB_URI");
}

let client;
let clientPromise;
function getClient() {
  if (!clientPromise) {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
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

    const db = (await getClient()).db("fomo");
    const col = db.collection("subscribers");
    await col.createIndex({ email: 1 }, { unique: true });

    const r = await col.updateOne(
      { email: e },
      {
        $setOnInsert: { email: e, createdAt: new Date() },
        $set: { name, cityPreference, source },
      },
      { upsert: true }
    );

    return res.json({ ok: true, alreadyExisted: r.upsertedCount === 0 });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.json({ ok: true, alreadyExisted: true });
    }
    console.error("Subscribe error:", err);
    // Surface the real error during debugging only:
    return res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
};
