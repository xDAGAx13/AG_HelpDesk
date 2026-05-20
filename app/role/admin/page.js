"use client";
import { auth, db } from "@/firebase/config";
import {
  collection,
  getDocs,
  getCountFromServer,
  doc,
  getDoc,
  query,
  orderBy,
  limit,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { FaFileDownload } from "react-icons/fa";
import { DEPARTMENTS } from "@/utils/ticketConstants";
import Navbar from "@/app/components/Navbar";
import TicketForm from "@/app/role/issuer/components/TicketForm";

const PAGE_SIZE = 15;

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

export default function AdminPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [totals, setTotals] = useState({ all: 0, resolved: 0, open: 0, onHold: 0 });
  const [showForm, setShowForm] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [ticketPage, setTicketPage] = useState(1);
  const TICKETS_PER_PAGE = 10;
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 8;
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [userError, setUserError] = useState("");

  const cursorsRef = useRef({});
  const exhaustedRef = useRef(new Set());

  const fetchPage = async (isInitial = false) => {
    const newTickets = [];
    const activeDepts = DEPARTMENTS.filter(
      (d) => !exhaustedRef.current.has(d)
    );

    await Promise.all(
      activeDepts.map(async (dept) => {
        const ticketsRef = collection(db, "tickets", dept, "all");
        const cursor = cursorsRef.current[dept];
        let q;

        if (cursor && !isInitial) {
          q = query(
            ticketsRef,
            orderBy("createdAt", "desc"),
            startAfter(cursor),
            limit(PAGE_SIZE)
          );
        } else {
          q = query(ticketsRef, orderBy("createdAt", "desc"), limit(PAGE_SIZE));
        }

        const snapshot = await getDocs(q);
        snapshot.docs.forEach((d) => {
          newTickets.push({ id: d.id, ...d.data(), department: dept });
        });

        if (snapshot.docs.length < PAGE_SIZE) {
          exhaustedRef.current.add(dept);
        }
        if (snapshot.docs.length > 0) {
          cursorsRef.current[dept] = snapshot.docs[snapshot.docs.length - 1];
        }
      })
    );

    newTickets.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
    setHasMore(exhaustedRef.current.size < DEPARTMENTS.length);
    return newTickets;
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists() || snap.data().role !== "admin") {
          router.push("/login");
          return;
        }
        setName(snap.data().name?.split(" ")[0] || "");

        const [initial, usersSnap, ...countSnaps] = await Promise.all([
          fetchPage(true),
          getDocs(collection(db, "users")),
          // Count all, resolved, open, on-hold across every department
          ...["all", "closed", "open", "On Hold"].map((status) =>
            Promise.all(
              DEPARTMENTS.map((dept) =>
                getCountFromServer(
                  status === "all"
                    ? query(collection(db, "tickets", dept, "all"))
                    : query(
                        collection(db, "tickets", dept, "all"),
                        where("status", "==", status)
                      )
                )
              )
            )
          ),
        ]);

        setTickets(initial);

        const fetchedUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllUsers(fetchedUsers);
        setUsers(fetchedUsers);

        const sum = (snaps) => snaps.reduce((acc, s) => acc + s.data().count, 0);
        const [allSnaps, resolvedSnaps, openSnaps, onHoldSnaps] = countSnaps;
        setTotals({
          all: sum(allSnaps),
          resolved: sum(resolvedSnaps),
          open: sum(openSnaps),
          onHold: sum(onHoldSnaps),
        });
      } catch (e) {
        console.error("Admin page load error:", e.message);
        setUserError(`Failed to load users: ${e.message}`);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const more = await fetchPage(false);
      setTickets((prev) => {
        const ids = new Set(prev.map((t) => t.id));
        const unique = more.filter((t) => !ids.has(t.id));
        return [...prev, ...unique].sort(
          (a, b) => b.createdAt?.seconds - a.createdAt?.seconds
        );
      });
    } catch (e) {
      console.error("Load more error:", e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const exportCSV = async () => {
    try {
      const allTickets = [];
      for (const dept of DEPARTMENTS) {
        const snapshot = await getDocs(
          query(
            collection(db, "tickets", dept, "all"),
            orderBy("createdAt", "desc")
          )
        );
        snapshot.docs.forEach((d) => {
          allTickets.push({ id: d.id, ...d.data(), department: dept });
        });
      }

      const headers = [
        "Department",
        "Title",
        "Sub Category",
        "Priority",
        "Status",
        "Raised By",
        "Issuer Email",
        "Location",
        "Submitted On",
        "Resolved/Held On",
        "Resolution Comment",
      ];

      const escape = (val) => `"${String(val || "").replace(/"/g, '""')}"`;

      const rows = allTickets.map((t) => [
        escape(t.department),
        escape(t.title),
        escape(t.subCategory),
        escape(t.priority),
        escape(t.status),
        escape(t.raisedBy),
        escape(t.issuerEmail),
        escape(t.location),
        t.createdAt?.seconds
          ? escape(
              format(
                new Date(t.createdAt.seconds * 1000),
                "dd MMM yyyy, hh:mm a"
              )
            )
          : "",
        t.CloseTimeStamp?.seconds
          ? escape(
              format(
                new Date(t.CloseTimeStamp.seconds * 1000),
                "dd MMM yyyy, hh:mm a"
              )
            )
          : "",
        escape(t.resolutionComment),
      ]);

      const csvContent =
        "﻿" +
        [headers, ...rows].map((r) => r.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `AG_Tickets_${format(new Date(), "dd-MMM-yyyy")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export error:", e.message);
      alert("Failed to export tickets.");
    }
  };

  const handleSignOut = async () => {
    setSignOutLoading(true);
    try {
      await signOut(auth);
      router.push("/login");
    } catch (e) {
      console.error(e.message);
    } finally {
      setSignOutLoading(false);
    }
  };

  useEffect(() => {
    setTicketPage(1);
  }, [search, deptFilter, statusFilter]);

  useEffect(() => {
    const term = userSearch.toLowerCase().trim();
    if (!term) {
      setUsers(allUsers);
    } else {
      setUsers(
        allUsers.filter(
          (u) =>
            u.name?.toLowerCase().includes(term) ||
            u.email?.toLowerCase().includes(term) ||
            u.department?.toLowerCase().includes(term)
        )
      );
    }
    setUserPage(1);
  }, [userSearch, allUsers]);

  const changeRole = async (userId, newRole) => {
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (e) {
      console.error("Role change error:", e.message);
      alert("Failed to change role.");
    }
  };

  const filtered = tickets.filter((t) => {
    const matchesDept = deptFilter === "All" || t.department === deptFilter;
    const matchesStatus =
      statusFilter === "All" || t.status === statusFilter;
    const term = search.toLowerCase();
    const matchesSearch =
      !search ||
      t.title?.toLowerCase().includes(term) ||
      t.raisedBy?.toLowerCase().includes(term) ||
      t.issuerEmail?.toLowerCase().includes(term);
    return matchesDept && matchesStatus && matchesSearch;
  });

  const stats = {
    total: filtered.length,
    open: filtered.filter((t) => t.status === "open").length,
    closed: filtered.filter((t) => t.status === "closed").length,
    onHold: filtered.filter((t) => t.status === "On Hold").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-16">
      <Navbar onSignOut={handleSignOut} loading={signOutLoading}>
        <button
          onClick={exportCSV}
          title="Export all tickets to Excel"
          className="cursor-pointer bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 hover:text-gray-200"
        >
          <FaFileDownload className="text-2xl" />
        </button>
      </Navbar>

      <div className="max-w-7xl mx-auto px-4 pt-20">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-500 text-center">
          Hi, {name}
        </h1>
        <h1 className="text-red-500 text-3xl font-semibold text-center mb-6">
          Admin Dashboard
        </h1>

        {/* Raise a ticket */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-sm px-4 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition cursor-pointer"
          >
            {showForm ? "✕ Cancel" : "+ Raise a Ticket"}
          </button>
          {showForm && (
            <div className="mt-3 border border-gray-200 rounded-xl p-4 shadow-sm">
              <TicketForm
                key={formKey}
                onSuccess={() => {
                  setFormKey((k) => k + 1);
                  setShowForm(false);
                  setTotals((prev) => ({ ...prev, all: prev.all + 1, open: prev.open + 1 }));
                }}
              />
            </div>
          )}
        </div>

        {/* All-time summary */}
        <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-5 mb-6">
          <p className="text-xs font-semibold uppercase text-red-400 tracking-wide mb-3">
            All-time helpdesk summary
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Filtered Tickets" value={stats.total} color="bg-gray-700" />
          <StatCard label="Open" value={stats.open} color="bg-red-600" />
          <StatCard label="Closed" value={stats.closed} color="bg-gray-400" />
          <StatCard label="On Hold" value={stats.onHold} color="bg-gray-600" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="Search title, name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <option value="All">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
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

        {/* Ticket Table */}
        {(() => {
          const totalPages = Math.max(1, Math.ceil(filtered.length / TICKETS_PER_PAGE));
          const safePage = Math.min(ticketPage, totalPages);
          const pageTickets = filtered.slice(
            (safePage - 1) * TICKETS_PER_PAGE,
            safePage * TICKETS_PER_PAGE
          );
          // If we're on the last available page and Firestore has more, fetch silently
          const isLastLoaded = safePage === totalPages;

          const handleNext = async () => {
            if (isLastLoaded && hasMore) {
              setLoadingMore(true);
              await loadMore();
              setLoadingMore(false);
            }
            setTicketPage((p) => p + 1);
          };

          const isNextDisabled = isLastLoaded && !hasMore || loadingMore;

          return (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm mb-3">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Title</th>
                      <th className="px-4 py-3 text-left">Dept</th>
                      <th className="px-4 py-3 text-left">Priority</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Raised By</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Submitted</th>
                      <th className="px-4 py-3 text-left">Resolved / Held</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-gray-400">
                          No tickets found.
                        </td>
                      </tr>
                    ) : (
                      pageTickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800 max-w-48 truncate">
                            {ticket.title}
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {ticket.department}
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
                              ? format(ticket.createdAt.toDate(), "dd MMM yy, hh:mm a")
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {ticket.CloseTimeStamp?.toDate
                              ? format(ticket.CloseTimeStamp.toDate(), "dd MMM yy, hh:mm a")
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {filtered.length > 0 && (
                <div className="flex items-center justify-between mb-10">
                  <p className="text-xs text-gray-400">
                    Showing {(safePage - 1) * TICKETS_PER_PAGE + 1}–
                    {Math.min(safePage * TICKETS_PER_PAGE, filtered.length)} of{" "}
                    {filtered.length} loaded
                    {hasMore ? " (more available)" : ""}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTicketPage((p) => p - 1)}
                      disabled={safePage === 1}
                      className="px-3 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                    >
                      ← Prev
                    </button>
                    <span className="px-3 py-1 text-xs text-gray-500">
                      {safePage} / {totalPages}
                    </span>
                    <button
                      onClick={handleNext}
                      disabled={isNextDisabled}
                      className="px-3 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                    >
                      {loadingMore ? "Loading…" : "Next →"}
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* User Management */}
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-2xl font-bold text-gray-700 mb-1">
            User Management
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Filter by name, email or department. Role changes save instantly.
          </p>
          {userError && (
            <p className="text-sm text-red-500 mb-3">{userError}</p>
          )}
          <input
            type="text"
            placeholder="Filter by name, email or department..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full mb-4 focus:outline-none focus:ring-2 focus:ring-red-300"
          />

          {users.length > 0 && (() => {
            const totalPages = Math.ceil(users.length / USERS_PER_PAGE);
            const pageUsers = users.slice(
              (userPage - 1) * USERS_PER_PAGE,
              userPage * USERS_PER_PAGE
            );
            return (
              <>
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left">Email</th>
                        <th className="px-4 py-3 text-left">Department</th>
                        <th className="px-4 py-3 text-left">Current Role</th>
                        <th className="px-4 py-3 text-left">Change Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pageUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {user.name || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{user.email}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {user.department || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                user.role === "admin"
                                  ? "bg-purple-100 text-purple-700"
                                  : user.role === "handler"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-green-100 text-green-700"
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={user.role}
                              onChange={(e) => changeRole(user.id, e.target.value)}
                              className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 cursor-pointer"
                            >
                              <option value="issuer">Issuer</option>
                              <option value="handler">Handler</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination controls */}
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-gray-400">
                    Showing {(userPage - 1) * USERS_PER_PAGE + 1}–
                    {Math.min(userPage * USERS_PER_PAGE, users.length)} of{" "}
                    {users.length} users
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUserPage((p) => p - 1)}
                      disabled={userPage === 1}
                      className="px-3 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                    >
                      ← Prev
                    </button>
                    <span className="px-3 py-1 text-xs text-gray-500">
                      {userPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setUserPage((p) => p + 1)}
                      disabled={userPage === totalPages}
                      className="px-3 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </>
            );
          })()}

          {users.length === 0 && !userError && (
            <p className="text-gray-400 text-sm">
              {userSearch ? "No users match your filter." : "No users found."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
