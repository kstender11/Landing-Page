// api/list-subscribers.js
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");

let client, clientPromise;
function getClient() {
  if (!clientPromise) {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

module.exports = async (req, res) => {
  try {
    const db = (await getClient()).db("fomo");
    const docs = await db
      .collection("subscribers")
      .find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    res.setHeader("cache-control", "no-store");
    res.json({ ok: true, count: docs.length, docs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
