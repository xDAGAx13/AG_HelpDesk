"use client";
import { auth, db } from "@/firebase/config";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Finlandica } from "next/font/google";
import { useRouter } from "next/navigation";
import React from "react";
import { useState } from "react";

const departments = ["IT", "HR", "Accounts", "Admin", 'Hiring'];
const priorities = ["Low", "Medium", "High"];
const ITcategories = ["Software", "Hardware", "New Equipment", "SAP"];

const HR = ['Attendance & Payslip', 'Other']
const Admin = ['General Maintenance', 'Other']
const Hiring = ['Follow-up', 'Other']

export default function TicketForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [raisedBy, setRaisedBy] = useState("");
  const [raisedByUid, setRaisedByUid] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [location, setLocation] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const router = useRouter();



  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !description || !department) {
      alert("Please fill all required fields.");
      return;
    }

    setLoading(true);
    setSuccessMsg("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      const userinfoSnap = await getDoc(doc(db, "users", user.uid));
      const name = userinfoSnap.data().name;

      await addDoc(collection(db, "tickets", department, 'all'), {
        title,
        description,
        department,
        priority,
        createdAt: serverTimestamp(),
        status: "open",
        issuerId: user.uid,
        issuerEmail: user.email,
        raisedBy: name,
        raisedByUid: user.uid,
        location,
        subCategory,
      });

      setSuccessMsg("Ticket Submitted Successfully");
      setTitle("");
      setDescription("");
      setDepartment("");
      setPriority("Medium");
      setRaisedBy(name);
      setRaisedByUid(user.uid);
      setSubCategory("");
      router.push("/");
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-red-500 shadow-xl p-6 rounded-xl space-y-4 text-gray-900"
    >
      {successMsg && <p className="text-green-400">{successMsg}</p>}

      <div>
        <label className="block font-semibold mb-1">Title</label>
        <input
          type="text"
          className="shadow-lg w-full pl-2 px-4 py-2 text-black border-red-400 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-300 placeholder:text-neutral-600"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short Issue Title"
        />
      </div>

      <div>
        <label className="block font-semibold mb-1">Location</label>
        <input
          type="text"
          className="shadow-lg w-full pl-2 px-4 py-2 text-black border-red-400 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-300 placeholder:text-neutral-600"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
        />
      </div>

      <div>
        <label className="block font-semibold mb-1">Description</label>
        <textarea
          className="shadow-lg w-full pl-2 px-4 py-2 text-black border-red-400 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-300 placeholder:text-neutral-600"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detailed Description of the issue"
          rows={4}
        />
      </div>

      <div>
        <label className="block font-semibold mb-1">Department</label>
        <select
          className="shadow-lg w-full p-2 rounded border-red-400 border  focus:outline-none focus:ring-2 focus:ring-red-300"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="">Select Department</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
      </div>

      {(department === "IT" || department === "Admin" || department==='HR' || department==='Hiring') && (
        <div>
          <label className="block font-semibold mb-1">Sub-Category</label>
          <select
            className="shadow-lg w-full p-2 rounded border-red-400 border focus:outline-none focus:ring-2 focus:ring-red-300"
            value={subCategory}
            onChange={(e) => setSubCategory(e.target.value)}
          >
            <option value="">Select Sub-Category</option>
            {(department === "IT" ? ITcategories : department==='HR'?HR:department==='Admin'?Admin:Hiring).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block font-semibold mb-1">Priority</label>
        <select
          className="shadow-lg w-full p-2 rounded border-red-400 border  focus:outline-none focus:ring-2 focus:ring-red-300"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          {priorities.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-gray-200 font-semibold disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Submitting..." : "Submit Ticket"}
      </button>
    </form>
  );
}
