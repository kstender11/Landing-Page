// api/admin/list.js
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
    const limit = Math.min(parseInt(req.query.limit || "200", 10), 1000);
    const skip  = parseInt(req.query.skip || "0", 10);
    const q     = (req.query.q || "").trim();

    const client = clientPromise || (clientPromise = new MongoClient(uri).connect());
    const col    = (await client).db("fomo").collection("subscribers");

    const filter = q
      ? { $or: [
            { email: { $regex: q, $options: "i" } },
            { name:  { $regex: q, $options: "i" } },
            { firstName: { $regex: q, $options: "i" } },
            { lastName:  { $regex: q, $options: "i" } },
            { referralCode: { $regex: q, $options: "i" } }
          ] }
      : {};

    const projection = {
      email: 1, firstName: 1, lastName: 1, name: 1,
      cityPreference: 1, createdAt: 1,
      referralCode: 1, referredBy: 1, referralCount: 1,
      source: 1
    };

    const [docs, total] = await Promise.all([
      col.find(filter, { projection }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      col.estimatedDocumentCount()
    ]);

    res.json({ ok: true, total, count: docs.length, docs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
