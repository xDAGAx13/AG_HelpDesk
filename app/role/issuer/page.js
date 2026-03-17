"use client";
import React, { useEffect, useState } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import TicketForm from "./components/TicketForm";
import TicketList from "./components/TicketList";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import Navbar from "@/app/components/Navbar";

export default function IssuerPage() {
  const router = useRouter();
  const auth = getAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userinfosnap = await getDoc(doc(db, "users", user.uid));
        if (userinfosnap.exists()) {
          const username = userinfosnap.data().name || "";
          setName(username.split(" ")[0]);
        }
      } catch (e) {
        console.error("Cannot Fetch Username:", e.message);
      }
    });

    return () => unsubscribe();
  }, []);

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
    <div className="bg-white">
      <Navbar onSignOut={handleSignOut} loading={loading} />
      <div className="p-4 max-w-3xl mx-auto bg-white mt-14">
        <h1 className="text-3xl font-bold text-center text-gray-600 text-shadow-md">
          Hi, {name}
        </h1>
        <h1 className="text-3xl font-bold mb-6 text-shadow-sm text-red-500 text-center">
          Raise A Ticket
        </h1>
        <TicketForm />
        <h2 className="text-2xl text-center font-semibold mt-10 text-shadow-md text-black">
          Your Tickets
        </h2>
        <TicketList />
      </div>
    </div>
  );
}
