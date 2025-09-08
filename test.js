require("dotenv").config();                 // ← loads .env in this folder
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGODB_URI in .env");
  process.exit(1);
}

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB!");
    const db = client.db("fomo");                 // database name
    const col = db.collection("subscribers");     // collection (auto-creates)
    const result = await col.insertOne({
      email: "test@example.com",
      createdAt: new Date()
    });
    console.log("Inserted:", result.insertedId);
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
  } finally {
    await client.close();
  }
}
run();
