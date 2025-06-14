"use client";
import { auth, db } from "@/firebase/config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  deleteDoc,
} from "firebase/firestore";
import React from "react";
import { useEffect } from "react";
import { useState } from "react";
import { format } from "date-fns";
import { FaTrash } from "react-icons/fa";
import { useRouter } from "next/navigation";

export default function TicketListSpecific() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          console.error("No Auth User");
          return;
        }
        const userinfoSnap = getDoc(doc(db, "users", user.uid));
        const userDepartment = (await userinfoSnap).data().department;
        const ticketsRef = collection(db, "tickets", userDepartment, "all");
        const q = query(ticketsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const userTickets = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setTickets(userTickets);
      } catch (e) {
        console.error("Error fetching tickets: ", e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const handleDelete = async (ticket) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this ticket?"
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "tickets", ticket.department, "all", ticket.id));
      setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
    } catch (e) {
      console.error("Failed to delete ticket: ", e.message);
    }
  };
  const handleResolve = async (ticket) => {
    const confirm = window.confirm(
      "Are you sure you want to mark this ticket as resolved?"
    );
    if (!confirm) return;

    const comment = window.prompt("Add any Comments (optional):", "");

    try {
      const ticketRef = doc(db, "tickets", ticket.department, "all", ticket.id);
      await updateDoc(ticketRef, {
        status: "closed",
        resolutionComment: comment || "",
        CloseTimeStamp: serverTimestamp(),
      });

      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticket.id
            ? { ...t, status: "closed", resolutionComment: comment || "" }
            : t
        )
      );
    } catch (e) {
      console.error("Error updating ticket Status: ", e.message);
    }

    router.push("../role/handler");
  };

  const handleReopen = async (ticket) => {
    const confirm = window.confirm(
      "Are you sure you want to Re-Open this ticket?"
    );
    if (!confirm) return;

    try {
      const ticketRef = doc(db, "tickets", ticket.department, "all", ticket.id);

      await updateDoc(ticketRef, {
        status: "open",
      });

      setTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, status: "open" } : t))
      );
    } catch (e) {
      console.error(e.message);
    }
    router.push("../role/handler");
  };

  if (loading)
    return <p className="text-gray-500 mt-4">Loading your tickets...</p>;

  if (tickets.length === 0) {
    return <p className="text-gray-400 mt-4">No tickets submitted yet.</p>;
  }

  return (
    <div className="mt-4 space-y-4">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className=" p-4 rounded-lg border-2 shadow-xl border-red-500 text-gray-900"
        >
          <div className="flex flex-row justify-between items-center mb-2">
            <div className="flex flex-col">
              <h3 className="text-lg font-bold">{ticket.title}</h3>
              <p className="text-sm font-bold text-gray-500">
                Raised By: {ticket.raisedBy}
              </p>
              <p className="text-sm text-gray-500">
                Issuer By: {ticket.issuerEmail}
              </p>
              <p className="text-sm text-gray-500">Dept: {ticket.department}</p>
              <p className="text-sm text-gray-500">
                Location: {ticket.location}
              </p>
              <p className="text-sm text-gray-500">
                Priority: {ticket.priority}
              </p>
              <p className="text-sm text-gray-700 mt-1 font-semibold">
                Submitted on:{" "}
                {ticket.createdAt?.toDate
                  ? format(ticket.createdAt.toDate(), "dd MMM yyyy, hh:mm a")
                  : "N/A"}
              </p>
              {ticket.CloseTimeStamp && (
                <p className="text-sm text-green-700 mt-1 font-semibold ">
                  Resolved on:{" "}
                  {ticket.CloseTimeStamp?.toDate
                    ? format(
                        ticket.CloseTimeStamp.toDate(),
                        "dd MMM yyyy, hh:mm a"
                      )
                    : "N/A"}
                </p>
              )}
              {ticket.resolutionComment && (
                <p className="text-sm text-green-600 font-semibold">
                  Comment: {ticket.resolutionComment}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 items-end">
              {ticket.status === "open" ? (
                <button
                  onClick={() => handleResolve(ticket)}
                  className="text-md font-semibold p-2  bg-black cursor-pointer hover:bg-neutral-800 text-white rounded-2xl"
                >
                  Resolve
                </button>
              ) : (
                <button
                  onClick={() => handleReopen(ticket)}
                  className="text-md font-semibold p-2 rounded-2xl bg-black cursor-pointer hover:bg-neutral-800 text-white"
                >
                  Re-Open
                </button>
              )}

              <span
                className={`text-md font-semibold p-2  text-white rounded-2xl ${
                  ticket.status === "open" ? "bg-red-600" : "bg-gray-400"
                }`}
              >
                {ticket.status}
              </span>
              <button
                onClick={() => handleDelete(ticket)}
                className="text-xs text-white hover:text-gray-400 bg-black p-2 rounded-xl text-center hover:underline cursor-pointer"
              >
                <FaTrash size={25} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
