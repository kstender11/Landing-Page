// api/subscribe.js
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");

// Reuse the client across invocations
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

    // Ensure unique index on email
    await col.createIndex({ email: 1 }, { unique: true });

    const result = await col.updateOne(
      { email: e },
      {
        $setOnInsert: { email: e, createdAt: new Date() },
        $set: { name, cityPreference, source }
      },
      { upsert: true }
    );

    // With modern driver, check upsertedId to know if an insert happened
    const inserted = !!result.upsertedId;

    return res.json({
      ok: true,
      inserted,
      alreadyExisted: !inserted,
      // helpful debug (remove later if you want)
      upsertedId: result.upsertedId ?? null,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    if (err && err.code === 11000) {
      // Duplicate key – record exists
      return res.json({ ok: true, inserted: false, alreadyExisted: true, dup: true });
    }
    console.error("Subscribe error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
};
