"use client";
import { db } from "@/firebase/config";
import { collection, getDocs } from "firebase/firestore";

export default function DownloadUsersCSV() {
  const handleDownload = async () => {
    try {
      // Fetch all users
      const querySnapshot = await getDocs(collection(db, "users"));
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });

      if (users.length === 0) {
        alert("No users found!");
        return;
      }

      // Convert JSON to CSV
      const headers = Object.keys(users[0]);
      const csvRows = [];
      csvRows.push(headers.join(",")); // header row

      users.forEach((user) => {
        const values = headers.map((header) => {
          let val = user[header];
          if (typeof val === "string") {
            // escape quotes and commas
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        });
        csvRows.push(values.join(","));
      });

      const csvContent = csvRows.join("\n");

      // Trigger download
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.href = url;
      a.download = "users.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading users:", error);
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500"
    >
      Download Users CSV
    </button>
  );
}
