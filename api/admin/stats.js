// api/admin/stats.js
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
if (!uri) throw new Error("Missing MONGODB_URI");

let clientPromise;
function auth(req, res) {
  const token = req.headers["x-admin-token"] || req.query.token;
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return false;
  }
  return true;
}

module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  try {
    const client = clientPromise || (clientPromise = new MongoClient(uri).connect());
    const col = (await client).db("fomo").collection("subscribers");

    const total = await col.estimatedDocumentCount();
    const referred = await col.countDocuments({ referredBy: { $exists: true } });

    const topReferrers = await col.aggregate([
      { $project: { email: 1, name: 1, firstName:1, lastName:1, referralCode: 1, referralCount: { $ifNull: ["$referralCount", 0] } } },
      { $sort: { referralCount: -1, email: 1 } },
      { $limit: 20 }
    ]).toArray();

    res.json({ ok: true, total, referred, topReferrers });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
