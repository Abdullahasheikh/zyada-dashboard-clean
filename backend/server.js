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

// Webhook: جميع الأحداث + تخزين التوكن من app.store.authorize
app.post("/webhooks/events", async (req, res) => {
  try {
    const { event, merchant, created_at, data } = req.body;
    console.log(`📥 Event received: ${event}`);

    await client.connect();
    const db = client.db("zyada");

    // 📌 التعامل مع حدث التوكن
    if (event === "app.store.authorize") {
      const store_id = Number(merchant);
      const access_token = data?.access_token;

      if (!store_id || !access_token) {
        console.log("❌ Missing store_id or access_token");
        return res.status(400).json({ error: "Missing store_id or access_token" });
      }

      const stores = db.collection("connected_stores");

      await stores.updateOne(
        { store_id },
        {
          $set: {
            store_id,
            access_token,
            refresh_token: data?.refresh_token,
            token_type: data?.token_type,
            connected_at: new Date()
          }
        },
        { upsert: true }
      );

      console.log("✅ Access Token saved for store:", store_id);
    }

    // ✨ تخزين كل الأحداث الأخرى في logs
    const logs = db.collection("webhook_logs");
    await logs.insertOne({
      event,
      merchant,
      created_at: created_at || new Date(),
      data,
      received_at: new Date()
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error handling webhook:", err);
    res.sendStatus(500);
  }
});

// ✅ API: عرض جميع الأحداث
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

// ✅ API: عرض المتاجر المتصلة
app.get("/api/connected-stores", async (req, res) => {
  try {
    await client.connect();
    const db = client.db("zyada");
    const stores = db.collection("connected_stores");

    const result = await stores
      .find({ access_token: { $exists: true } })
      .sort({ connected_at: -1 })
      .limit(100)
      .toArray();

    res.json(result);
  } catch (err) {
    console.error("❌ Error fetching connected stores:", err);
    res.status(500).json({ error: "Failed to fetch connected stores" });
  }
});

// ✅ API: عرض الأحداث الخاصة بمتجر معيّن
app.get("/api/store/:store_id/events", async (req, res) => {
  try {
    const store_id = Number(req.params.store_id);
    if (!store_id) return res.status(400).json({ error: "Store ID is required" });

    await client.connect();
    const db = client.db("zyada");
    const logs = db.collection("webhook_logs");

    const events = await logs
      .find({ merchant: store_id })
      .sort({ received_at: -1 })
      .limit(50)
      .toArray();

    res.json(events);
  } catch (err) {
    console.error("❌ Error fetching store events:", err);
    res.status(500).json({ error: "Failed to fetch store events" });
  }
});

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.send("🚀 Webhook + MongoDB unified server is running.");
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
