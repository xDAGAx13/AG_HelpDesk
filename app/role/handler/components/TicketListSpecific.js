"use client";
import { auth, db } from "@/firebase/config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  deleteDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { FaTrash } from "react-icons/fa";

const PAGE_SIZE = 10;

function StatCard({ label, value, color }) {
  return (
    <div
      className={`rounded-xl p-4 shadow-md text-white ${color} flex flex-col items-center`}
    >
      <span className="text-3xl font-bold">{value}</span>
      <span className="text-sm mt-1 font-semibold">{label}</span>
    </div>
  );
}

export default function TicketListSpecific() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [expandedId, setExpandedId] = useState(null);
  const [totals, setTotals] = useState({ all: 0, resolved: 0, open: 0, onHold: 0 });
  const lastDocRef = useRef(null);
  const deptRef = useRef(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        console.error("No Auth User");
        setLoading(false);
        return;
      }

      try {
        const userinfoSnap = await getDoc(doc(db, "users", user.uid));
        const userDepartment = userinfoSnap.data()?.department;
        deptRef.current = userDepartment;

        const ticketsRef = collection(db, "tickets", userDepartment, "all");

        const [snapshot, ...countSnaps] = await Promise.all([
          getDocs(query(ticketsRef, orderBy("createdAt", "desc"), limit(PAGE_SIZE))),
          getCountFromServer(query(ticketsRef)),
          getCountFromServer(query(ticketsRef, where("status", "==", "closed"))),
          getCountFromServer(query(ticketsRef, where("status", "==", "open"))),
          getCountFromServer(query(ticketsRef, where("status", "==", "On Hold"))),
        ]);

        const [allSnap, resolvedSnap, openSnap, onHoldSnap] = countSnaps;
        setTotals({
          all: allSnap.data().count,
          resolved: resolvedSnap.data().count,
          open: openSnap.data().count,
          onHold: onHoldSnap.data().count,
        });

        const userTickets = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          department: userDepartment,
        }));
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null;
        setHasMore(snapshot.docs.length === PAGE_SIZE);
        setTickets(userTickets);
      } catch (e) {
        console.error("Error fetching tickets: ", e.message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadMore = async () => {
    if (!lastDocRef.current || !deptRef.current) return;
    setLoadingMore(true);

    try {
      const ticketsRef = collection(db, "tickets", deptRef.current, "all");
      const q = query(
        ticketsRef,
        orderBy("createdAt", "desc"),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE)
      );
      const snapshot = await getDocs(q);

      const more = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        department: deptRef.current,
      }));
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null;
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      setTickets((prev) => [...prev, ...more]);
    } catch (e) {
      console.error("Error loading more tickets: ", e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (ticket) => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;
    try {
      await deleteDoc(doc(db, "tickets", ticket.department, "all", ticket.id));
      setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
    } catch (e) {
      console.error("Failed to delete ticket: ", e.message);
    }
  };

  const handleResolve = async (ticket) => {
    if (!window.confirm("Mark this ticket as resolved?")) return;
    const comment = window.prompt("Add any Comments (optional):", "");
    try {
      await updateDoc(doc(db, "tickets", ticket.department, "all", ticket.id), {
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
      console.error("Error resolving ticket:", e.message);
    }
  };

  const handleHold = async (ticket) => {
    if (!window.confirm("Put this ticket on hold?")) return;
    const comment = window.prompt("Add any Comments (optional):", "");
    try {
      await updateDoc(doc(db, "tickets", ticket.department, "all", ticket.id), {
        status: "On Hold",
        resolutionComment: comment || "",
        CloseTimeStamp: serverTimestamp(),
      });
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticket.id
            ? { ...t, status: "On Hold", resolutionComment: comment || "" }
            : t
        )
      );
    } catch (e) {
      console.error("Error holding ticket:", e.message);
    }
  };

  const handleReopen = async (ticket) => {
    if (!window.confirm("Re-open this ticket?")) return;
    try {
      await updateDoc(doc(db, "tickets", ticket.department, "all", ticket.id), {
        status: "open",
      });
      setTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, status: "open" } : t))
      );
    } catch (e) {
      console.error("Error reopening ticket:", e.message);
    }
  };

  const filtered = tickets.filter((t) => {
    const matchesStatus =
      statusFilter === "All" || t.status === statusFilter;
    const term = search.toLowerCase();
    const matchesSearch =
      !search ||
      t.title?.toLowerCase().includes(term) ||
      t.raisedBy?.toLowerCase().includes(term) ||
      t.issuerEmail?.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: filtered.length,
    open: filtered.filter((t) => t.status === "open").length,
    closed: filtered.filter((t) => t.status === "closed").length,
    onHold: filtered.filter((t) => t.status === "On Hold").length,
  };

  if (loading)
    return <p className="text-gray-500 mt-6">Loading department tickets...</p>;

  if (tickets.length === 0)
    return <p className="text-gray-400 mt-6">No tickets in your department yet.</p>;

  return (
    <div className="mt-6 space-y-5">
      {/* All-time dept summary */}
      <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-5">
        <p className="text-xs font-semibold uppercase text-red-400 tracking-wide mb-3">
          All-time department summary
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-3xl font-extrabold text-gray-800">{totals.all}</p>
            <p className="text-xs text-gray-500 mt-1 font-semibold">Total Raised</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-green-600">{totals.resolved}</p>
            <p className="text-xs text-gray-500 mt-1 font-semibold">Resolved</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-red-600">{totals.open}</p>
            <p className="text-xs text-gray-500 mt-1 font-semibold">Open</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-yellow-600">{totals.onHold}</p>
            <p className="text-xs text-gray-500 mt-1 font-semibold">On Hold</p>
          </div>
        </div>
        {totals.all > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Resolution rate</span>
              <span className="font-semibold text-green-600">
                {Math.round((totals.resolved / totals.all) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((totals.resolved / totals.all) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Current batch stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Filtered" value={stats.total} color="bg-gray-700" />
        <StatCard label="Open" value={stats.open} color="bg-red-600" />
        <StatCard label="Closed" value={stats.closed} color="bg-gray-400" />
        <StatCard label="On Hold" value={stats.onHold} color="bg-gray-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search title, name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-red-300"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
        >
          <option value="All">All Statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="On Hold">On Hold</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Raised By</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Submitted</th>
              <th className="px-4 py-3 text-left">Resolved / Held</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-400">
                  No tickets match your search.
                </td>
              </tr>
            ) : (
              filtered.map((ticket) => (
                <React.Fragment key={ticket.id}>
                  {/* Main row */}
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      setExpandedId(
                        expandedId === ticket.id ? null : ticket.id
                      )
                    }
                  >
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-44 truncate">
                      {ticket.title}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          ticket.priority === "High"
                            ? "bg-red-100 text-red-700"
                            : ticket.priority === "Medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {ticket.priority || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          ticket.status === "open"
                            ? "bg-red-100 text-red-700"
                            : ticket.status === "closed"
                              ? "bg-gray-200 text-gray-600"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {ticket.raisedBy}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {ticket.issuerEmail}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {ticket.createdAt?.toDate
                        ? format(
                            ticket.createdAt.toDate(),
                            "dd MMM yy, hh:mm a"
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {ticket.CloseTimeStamp?.toDate
                        ? format(
                            ticket.CloseTimeStamp.toDate(),
                            "dd MMM yy, hh:mm a"
                          )
                        : "—"}
                    </td>
                    {/* Actions — stop row-click propagation */}
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {ticket.status === "open" ? (
                          <>
                            <button
                              onClick={() => handleResolve(ticket)}
                              className="px-2 py-1 text-xs font-semibold bg-black text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleHold(ticket)}
                              className="px-2 py-1 text-xs font-semibold bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer"
                            >
                              Hold
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleReopen(ticket)}
                            className="px-2 py-1 text-xs font-semibold bg-black text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
                          >
                            Re-Open
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(ticket)}
                          className="p-1.5 bg-black text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {expandedId === ticket.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                          {ticket.subCategory && (
                            <p>
                              <span className="font-semibold">Sub-category:</span>{" "}
                              {ticket.subCategory}
                            </p>
                          )}
                          {ticket.location && (
                            <p>
                              <span className="font-semibold">Location:</span>{" "}
                              {ticket.location}
                            </p>
                          )}
                          {ticket.description && (
                            <p className="sm:col-span-2">
                              <span className="font-semibold">Description:</span>{" "}
                              {ticket.description}
                            </p>
                          )}
                          {ticket.resolutionComment && (
                            <p className="sm:col-span-2 text-green-700">
                              <span className="font-semibold">Comment:</span>{" "}
                              {ticket.resolutionComment}
                            </p>
                          )}
                          {ticket.imageUrl && (
                            <p>
                              <a
                                href={ticket.imageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-red-600 underline font-semibold hover:text-black"
                              >
                                View Attached Image
                              </a>
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-2 bg-black text-white font-semibold rounded-2xl hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
