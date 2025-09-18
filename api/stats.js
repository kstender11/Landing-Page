// api/stats.js
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");

let clientPromise;

module.exports = async (req, res) => {
  try {
    const client = clientPromise || (clientPromise = new MongoClient(uri).connect());
    const col = (await client).db("fomo").collection("subscribers");

    const users = await col.estimatedDocumentCount();
    const venues = 1328; // ✅ hardcoded for now, replace with DB lookup later

    res.json({ ok: true, users, venues });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
