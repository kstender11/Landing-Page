require("dotenv").config();
const { MongoClient } = require("mongodb");

async function test() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Missing MONGODB_URI in .env");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const col = client.db("fomo").collection("subscribers");

    // Insert a test signup
    const email = "apitest+" + Date.now() + "@example.com";
    const doc = { email, source: "test-api", cityPreference: "SF Bay Area", createdAt: new Date() };

    const res = await col.updateOne(
      { email },
      { $setOnInsert: doc },
      { upsert: true }
    );

    console.log("✅ Test inserted:", email, res.upsertedId || "already existed");

    // Read back to confirm
    const found = await col.findOne({ email });
    console.log("🔎 Found in DB:", found);
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.close();
  }
}

test();
