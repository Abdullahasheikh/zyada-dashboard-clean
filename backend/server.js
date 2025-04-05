const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());

const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);

// Webhook: استلام التوكن عند التثبيت
app.post("/webhooks/authorize", async (req, res) => {
  try {
    console.log("🔥 Webhook Triggered!");
    console.log("📦 Full Body:", req.body);

    const data = req.body.data;
    const store_id = data.store_id || req.body.merchant;

    if (!data || !data.access_token) {
      console.log("❌ Missing access_token in webhook!");
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log("✅ Access Token:", data.access_token);
    console.log("🔁 Refresh Token:", data.refresh_token);
    console.log("🛍️ Store ID:", store_id);

    // تخزين البيانات في MongoDB
    await client.connect();
    const db = client.db("zyada");
    const stores = db.collection("connected_stores");

    await stores.updateOne(
      { store_id },
      {
        $set: {
          store_id,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          token_type: data.token_type,
          connected_at: new Date()
        }
      },
      { upsert: true }
    );

    console.log("✅ Store data saved to MongoDB");

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error handling webhook:", err);
    res.sendStatus(500);
  }
});

// Webhook: تسجيل كل الأحداث العامة
app.post("/webhooks/events", async (req, res) => {
  try {
    const { event, merchant, created_at, data } = req.body;

    if (!event) {
      return res.status(400).json({ error: "Missing event name" });
    }

    await client.connect();
    const db = client.db("zyada");
    const logs = db.collection("webhook_logs");

    await logs.insertOne({
      event,
      merchant,
      created_at: created_at || new Date(),
      data,
      received_at: new Date()
    });

    console.log(`📥 Event received: ${event}`);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error handling general webhook:", err);
    res.sendStatus(500);
  }
});

// API: عرض آخر الأحداث من قاعدة البيانات
app.get("/api/events", async (req, res) => {
  try {
    await client.connect();
    const db = client.db("zyada");
    const logs = db.collection("webhook_logs");

    const events = await logs
      .find({})
      .sort({ received_at: -1 })
      .limit(100)
      .toArray();

    res.json(events);
  } catch (err) {
    console.error("❌ Error fetching events:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

app.get("/", (req, res) => {
  res.send("🚀 Webhook + MongoDB server is running.");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
