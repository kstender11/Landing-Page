// api/list-subscribers.js
const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.MONGODB_URI);

module.exports = async (req, res) => {
  try {
    await client.connect();
    const docs = await client
      .db("fomo")
      .collection("subscribers")
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    res.json({ ok: true, count: docs.length, docs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
