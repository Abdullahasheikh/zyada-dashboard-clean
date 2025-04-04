import React, { useEffect, useState } from "react";
import axios from "axios";

export default function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("https://www.zyada.io/api/events")
      .then(res => {
        setEvents(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching events", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">📊 لوحة أحداث Webhooks</h1>
      {loading ? (
        <p className="text-center text-gray-500">جاري تحميل الأحداث...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow p-4">
          <table className="min-w-full text-sm text-right">
            <thead>
              <tr className="bg-gray-200 text-gray-700">
                <th className="p-2">الحدث</th>
                <th className="p-2">رقم التاجر</th>
                <th className="p-2">وقت الإنشاء</th>
                <th className="p-2">تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{ev.event}</td>
                  <td className="p-2">{ev.merchant}</td>
                  <td className="p-2 text-xs text-gray-600">{new Date(ev.received_at).toLocaleString()}</td>
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
      )}
    </div>
  );
}
