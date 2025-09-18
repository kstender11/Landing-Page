// api/lookup.js
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");

let clientPromise;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ ok: false, error: "Email required" });
    }

    const client = clientPromise || (clientPromise = new MongoClient(uri).connect());
    const col = (await client).db("fomo").collection("subscribers");

    const doc = await col.findOne({ email }, { projection: { referralCode: 1 } });

    if (!doc?.referralCode) {
      return res.json({
        ok: true,
        found: false,
        referralCode: null
      });
    }

    res.json({
      ok: true,
      found: true,
      referralCode: doc.referralCode
    });
  } catch (err) {
    console.error("Lookup error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
};
