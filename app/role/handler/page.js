"use client";
import { auth, db } from "@/firebase/config";
import { signOut } from "firebase/auth";
import {
  getDoc,
  doc,
  collection,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import TicketListSpecific from "./components/TicketListSpecific";
import TicketForm from "../issuer/components/TicketForm";
import { FaFileDownload } from "react-icons/fa";
import Navbar from "@/app/components/Navbar";

const CSV_DEPARTMENTS = ["IT", "HR", "Accounts", "Sales"];

export default function Page() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tickets, setTickets] = useState([]);
  const [tickDepartment, setTickDepartment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTicketinfo = async () => {
      let allTickets = [];
      try {
        for (const dept of CSV_DEPARTMENTS) {
          const deptref = collection(db, "tickets", dept, "all");
          const snapshot = await getDocs(deptref);

          snapshot.forEach((doc) => {
            const data = doc.data();
            allTickets.push({ id: doc.id, ...data, department: dept });
          });
        }

        setTickets(allTickets);
      } catch (e) {
        console.error("Error fetching Tickets", e.message);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userinfosnap = await getDoc(doc(db, "users", user.uid));
          if (userinfosnap.exists()) {
            const username = userinfosnap.data().name || "";
            setName(username.split(" ")[0]);
            setTickDepartment(userinfosnap.data().department);
          }
        } catch (e) {
          alert("Cannot Fetch Username");
          console.error(e.message);
        }

        fetchTicketinfo();
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, []);

  const downloadCSV = async (tickets) => {
    const confirmCleanup = window.confirm(
      "This will eliminate all resolved older than 7 days from the dashboard. Do you wish to continue?"
    );

    if (!confirmCleanup) return;

    const headers = [
      "Department",
      "Title",
      "Status",
      "Created At",
      "User Email",
      "Raised By",
    ];
    const rows = tickets.map((ticket) => [
      `${ticket.department}`,
      ticket.title,
      ticket.status,
      new Date(ticket.createdAt?.seconds * 1000).toISOString(),
      ticket.userEmail,
      ticket.raisedBy,
    ]);

    let csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "tickets.csv";
    link.click();
    URL.revokeObjectURL(url);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const ticketsToDelete = tickets.filter((ticket) => {
      if (ticket.status !== "closed") return false;
      const closedTime = ticket.CloseTimeStamp?.toDate?.() || new Date(0);
      return closedTime < sevenDaysAgo;
    });

    for (const ticket of ticketsToDelete) {
      try {
        await deleteDoc(
          doc(db, "tickets", ticket.department, "all", ticket.id)
        );
      } catch (e) {
        alert(`Failed to delete ticket ${ticket.title}: `, e.message);
      }
    }

    setTickets((prev) =>
      prev.filter((t) => !ticketsToDelete.some((del) => del.id === t.id))
    );
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      router.push("/login");
    } catch (e) {
      console.error("Sign Out Error: ", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-10">
      <Navbar onSignOut={handleSignOut} loading={loading}>
        <button
          onClick={() => downloadCSV(tickets)}
          className="cursor-pointer bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 hover:text-gray-200"
        >
          <FaFileDownload className="text-2xl" />
        </button>
      </Navbar>
      <div className="flex-col p-4 max-w-4xl mx-auto gap-2 pt-20">
        <h1 className="text-3xl font-bold text-gray-500 text-shadow-md text-center">
          Hi, {name}
        </h1>
        <h1 className="text-red-500 text-shadow-sm text-3xl font-semibold text-center mb-5">
          Raise and Handle
        </h1>
        <TicketForm />
        <h1 className="text-black text-shadow-md font-bold text-3xl text-center mt-5">
          Handle {tickDepartment} Tickets
        </h1>
        <TicketListSpecific />
      </div>
    </div>
  );
}
