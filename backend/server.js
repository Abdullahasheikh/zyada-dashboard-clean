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
    console.log("🔥 Webhook Triggered: /webhooks/authorize");
    console.log("📦 Full Body:", JSON.stringify(req.body, null, 2));

    const data = req.body?.data;
    const store_id = data?.store_id || req.body?.merchant;

    console.log("🧪 Parsed store_id:", store_id);
    console.log("🧪 Parsed access_token:", data?.access_token);

    if (!data || !data.access_token || !store_id) {
      console.log("❌ Missing access_token or store_id");
      return res.status(400).json({ error: "Missing access_token or store_id" });
    }

    console.log("✅ Access Token:", data.access_token);
    console.log("🔁 Refresh Token:", data.refresh_token);
    console.log("🛍️ Store ID:", store_id);

    await client.connect();
    const db = client.db("zyada");
    const stores = db.collection("connected_stores");

    const result = await stores.updateOne(
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
    console.log("🧾 MongoDB Response:", result);

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error handling /webhooks/authorize:", err);
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

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.send("🚀 Webhook + MongoDB server is running.");
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
