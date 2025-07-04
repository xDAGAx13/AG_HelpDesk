"use client";
import { auth, db } from "@/firebase/config";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  orderBy,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import React from "react";
import { useEffect } from "react";
import { useState } from "react";
import { format } from "date-fns";
import { FaTrash } from "react-icons/fa";
import { onAuthStateChanged } from "firebase/auth";

export default function TicketList() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [descriptionPopup, setDescriptionPopup] = useState(null);


  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.error("No authenticated user");
      setLoading(false);
      return;
    }

    try {
      const departments = ["IT", "HR", "Accounts", "Admin", "Hiring"];
      const allTickets = [];

      for (const dept of departments) {
        const ticketsRef = collection(db, "tickets", dept, "all");
        const snapshot = await getDocs(ticketsRef);
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.issuerId === user.uid) {
            allTickets.push({
              id: doc.id,
              ...data,
              department: dept,
            });
          }
        });
      }

      allTickets.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setTickets(allTickets);
    } catch (e) {
      console.error("Error fetching tickets: ", e.message);
    } finally {
      setLoading(false);
    }
  });

  return () => unsubscribe();
}, []);

  if (loading)
    return <p className="text-gray-500 mt-4">Loading your tickets...</p>;

  if (tickets.length === 0) {
    return <p className="text-gray-400 mt-4">No tickets submitted yet.</p>;
  }

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
  };

  return (
    <div className="mt-4 space-y-4">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="p-4 rounded-lg border border-red-500 shadow-lg text-gray-900"
        >
          <div className="flex flex-row justify-between items-center mb-2">
            <div>
              <h3 className="text-lg font-bold">{ticket.title}</h3>
              <p className="text-sm text-gray-500">
                Raised By: {ticket.raisedBy}
              </p>
              <p className="text-sm text-gray-500">Dept: {ticket.department}</p>
              <p className="text-sm text-gray-500">
                Location: {ticket.location}
              </p>
              <p className="text-sm text-gray-500">
                Priority: {ticket.priority}
              </p>
              {ticket.description && (
                <p className="text-sm text-gray-500 font-semibold">
                  Description:{" "}
                  {ticket.description.length > 60 && !ticket.expanded ? (
                    <>
                      {ticket.description.slice(0, 60)}...
                      <button
                        onClick={() =>
                          setTickets((prev) =>
                            prev.map((t) =>
                              t.id === ticket.id ? { ...t, expanded: true } : t
                            )
                          )
                        }
                        className="text-red-500 font-semibold hover:underline ml-1 cursor-pointer"
                      >
                        more
                      </button>
                    </>
                  ) : (
                    <>
                      {ticket.description}
                      {ticket.description.length > 60 && (
                        <button
                          onClick={() =>
                            setTickets((prev) =>
                              prev.map((t) =>
                                t.id === ticket.id
                                  ? { ...t, expanded: false }
                                  : t
                              )
                            )
                          }
                          className="text-red-500 font-semibold hover:underline ml-1 cursor-pointer"
                        >
                          less
                        </button>
                      )}
                    </>
                  )}
                </p>
              )}
              <p className="text-sm text-gray-700 mt-1 font-semibold">
                Submitted on:{" "}
                {ticket.createdAt?.toDate
                  ? format(ticket.createdAt.toDate(), "dd MMM yyyy, hh:mm a")
                  : "N/A"}
              </p>
              {ticket.imageUrl &&(
                <a href={ticket.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-sm font-semibold  text-gray-700 underline hover:text-black cursor-pointer">View Image</a>
              )}
              {ticket.CloseTimeStamp?.toDate && (
                <p className="text-sm text-green-700 font-semibold">
                  {ticket.status==='closed'?'Resolved:':'Held'} on:{" "}
                  {format(
                    ticket.CloseTimeStamp.toDate(),
                    "dd MMM yyyy, hh:mm a"
                  )}
                </p>
              )}
            </div>
            <div className="flex flex-col items-center justify-center gap-5 pl-10">
              
              <span
                className={`text-sm px-2 py-1 mb-1 text-white rounded-2xl font-semibold ${
                  ticket.status === "open" ? "bg-red-600" : "bg-gray-500"
                }`}
              >
                {ticket.status}
              </span>
              {ticket.status === "closed" && (
                <button
                  onClick={() => handleReopen(ticket)}
                  className="text-md font-semibold p-2 rounded-2xl bg-black cursor-pointer hover:bg-neutral-800 text-white"
                >
                  Re-Open
                </button>
              )}
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
