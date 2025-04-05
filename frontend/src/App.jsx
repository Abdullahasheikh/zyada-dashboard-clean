import React, { useEffect, useState } from "react";
import axios from "axios";

export default function App() {
  const [stores, setStores] = useState([]);
  const [eventsByStore, setEventsByStore] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/connected-stores`);
        const storesData = res.data;
        setStores(storesData);

        // اجلب الأحداث لكل متجر
        const allEvents = {};
        for (const store of storesData) {
          const eventsRes = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/store/${store.store_id}/events`
          );
          allEvents[store.store_id] = eventsRes.data;
        }

        setEventsByStore(allEvents);
        setLoading(false);
      } catch (err) {
        console.error("❌ Error:", err);
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">📊 المتاجر المتصلة والأحداث</h1>

      {loading ? (
        <p className="text-center text-gray-500">جاري تحميل البيانات...</p>
      ) : (
        stores.map((store) => (
          <div key={store.store_id} className="mb-8 bg-white shadow rounded-xl p-4">
            <h2 className="text-xl font-semibold mb-2">🛍️ المتجر: {store.store_id}</h2>
            <p className="text-sm text-gray-600 mb-2">
              ⏰ تم الاتصال في: {new Date(store.connected_at).toLocaleString()}
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-right mt-4">
                <thead>
                  <tr className="bg-gray-200 text-gray-700">
                    <th className="p-2">الحدث</th>
                    <th className="p-2">وقت الحدث</th>
                    <th className="p-2">تفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {(eventsByStore[store.store_id] || []).map((ev, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{ev.event}</td>
                      <td className="p-2 text-xs text-gray-600">
                        {new Date(ev.received_at).toLocaleString()}
                      </td>
                      <td className="p-2">
                        <details>
                          <summary className="text-blue-600 cursor-pointer">عرض</summary>
                          <pre className="bg-gray-100 p-2 mt-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(ev.data, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
