// api/subscribe.js
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");

let client, clientPromise, indexesEnsured = false;

function genCode(n = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/I/1
  let s = "";
  for (let i = 0; i < n; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

async function getCollection() {
  if (!clientPromise) {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  const conn = await clientPromise;
  const col = conn.db("fomo").collection("subscribers");

  if (!indexesEnsured) {
    try {
      await col.createIndex({ email: 1 }, { unique: true, name: "uniq_email" });
    } catch (e) { if (e.code !== 11000 && e.code !== 85) console.error("email index:", e); }
    try {
      await col.createIndex({ referralCode: 1 }, { unique: true, name: "uniq_referralCode", sparse: true });
    } catch (e) { if (e.code !== 11000 && e.code !== 85) console.error("refcode index:", e); }
    indexesEnsured = true;
  }
  return col;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { email, firstName, lastName, cityPreference, source = "waitlist", referrerCode } = req.body || {};
    const e  = String(email || "").toLowerCase().trim();
    const fn = String(firstName || "").trim();
    const ln = String(lastName || "").trim();

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    const nameRegex  = /^[a-zA-Z ,.'-]{1,60}$/;
    const namesValid = nameRegex.test(fn) && nameRegex.test(ln);

    if (!emailValid) return res.status(400).json({ ok: false, error: "Invalid email" });
    if (!fn || !ln || !namesValid) {
      return res.status(400).json({ ok: false, error: "First and last name required" });
    }

    const col = await getCollection();
    const name = `${fn} ${ln}`;

    // Upsert the subscriber
    const result = await col.updateOne(
      { email: e },
      {
        $setOnInsert: { email: e, createdAt: new Date() },
        $set: { firstName: fn, lastName: ln, name, cityPreference, source }
      },
      { upsert: true }
    );

    const inserted = !!result.upsertedId;

    // Ensure this user has a referralCode (for existing, add if missing)
    let myDoc = await col.findOne({ email: e }, { projection: { referralCode: 1 } });
    if (!myDoc?.referralCode) {
      for (let i = 0; i < 5; i++) {
        const code = genCode(6);
        try {
          const r = await col.updateOne(
            { email: e, referralCode: { $exists: false } },
            { $set: { referralCode: code } }
          );
          if (r.modifiedCount === 1) {
            myDoc = { referralCode: code };
            break;
          }
        } catch (err) {
          if (err.code === 11000) continue; // rare collision — retry
          else throw err;
        }
      }
      if (!myDoc?.referralCode) {
        // last-resort fetch (shouldn't happen)
        const refetched = await col.findOne({ email: e }, { projection: { referralCode: 1 } });
        myDoc = { referralCode: refetched?.referralCode || null };
      }
    }

    // If this is a brand-new signup AND we have a valid referrerCode (not self), credit the referrer
    if (inserted && referrerCode && myDoc?.referralCode && referrerCode !== myDoc.referralCode) {
      const refUpdate = await col.updateOne(
        { referralCode: referrerCode },
        { $inc: { referralCount: 1 } }
      );
      if (refUpdate.matchedCount === 1) {
        await col.updateOne({ email: e }, { $set: { referredBy: referrerCode } });
      }
      // If no match, ignore silently (bad/unknown ref link)
    }

    return res.json({
      ok: true,
      inserted,
      alreadyExisted: !inserted,
      referralCode: myDoc?.referralCode || null
    });
  } catch (err) {
    if (err && err.code === 11000) {
      // duplicate email
      const col = await getCollection();
      const doc = await col.findOne({ email: (req.body.email || "").toLowerCase().trim() }, { projection: { referralCode: 1 } });
      return res.json({ ok: true, inserted: false, alreadyExisted: true, referralCode: doc?.referralCode || null });
    }
    console.error("Subscribe error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
};
