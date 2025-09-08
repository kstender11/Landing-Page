// api/subscribe.js
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");

let client, clientPromise, indexEnsured = false;

async function getCollection() {
  if (!clientPromise) {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  const conn = await clientPromise;
  const col = conn.db("fomo").collection("subscribers");

  if (!indexEnsured) {
    try {
      await col.createIndex({ email: 1 }, { unique: true, name: "uniq_email" });
    } catch (e) {
      // Ignore expected conflicts (e.g., duplicates exist or index already there)
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
    const { email, firstName, lastName, cityPreference, source = "waitlist" } = req.body || {};
    const e  = String(email || "").toLowerCase().trim();
    const fn = String(firstName || "").trim();
    const ln = String(lastName || "").trim();

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    const nameRegex  = /^[a-zA-Z ,.'-]{1,60}$/; // simple, human-friendly
    const namesValid = nameRegex.test(fn) && nameRegex.test(ln);

    if (!emailValid) return res.status(400).json({ ok: false, error: "Invalid email" });
    if (!fn || !ln || !namesValid) {
      return res.status(400).json({ ok: false, error: "First and last name required" });
    }

    const col = await getCollection();
    const name = `${fn} ${ln}`;

    const result = await col.updateOne(
      { email: e },
      {
        $setOnInsert: { email: e, createdAt: new Date() },
        $set: { firstName: fn, lastName: ln, name, cityPreference, source }
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
      return res.json({ ok: true, inserted: false, alreadyExisted: true, reason: "dup-key" });
    }
    console.error("Subscribe error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
};
