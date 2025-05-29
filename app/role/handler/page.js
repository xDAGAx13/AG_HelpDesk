"use client";
import { auth, db } from "@/firebase/config";
import { signOut } from "firebase/auth";
import { getDoc, doc, collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import TicketListSpecific from "./components/TicketListSpecific";
import TicketForm from "./components/TicketForm";
import { FaSignOutAlt } from "react-icons/fa";
import { IoPerson } from "react-icons/io5";
import { FaFileDownload } from "react-icons/fa";

export default function Page() {
  
  const router = useRouter();
  const [name, setName] = useState("");
  const [tickets, setTickets] = useState([])
  const [tickDepartment, setTickDepartment] = useState('')

const departments = ["IT", "HR", "Accounts", "Sales"];

  useEffect(() => {
    const fetchUserinfo = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return console.error("User Not Signed In");
        const userinfosnap = await getDoc(doc(db, "users", user.uid));
        if (userinfosnap.exists()) {
          const username = userinfosnap.data().name || "";
          const firstname = username.split(" ")[0];
          const department = userinfosnap.data().department;
          setTickDepartment(department)
          setName(firstname);
        }
      } catch (e) {
        alert("Cannot Fetch Username");
        console.error(e.message);
      }
    };

    const fetchTicketinfo = async()=>{
      let allTickets = []
      try{
        for (const dept of departments){
          const deptref = collection(db, 'tickets', dept, 'all');
          const snapshot = await getDocs(deptref);

          snapshot.forEach(doc=>{
            const data = doc.data();
            allTickets.push({
              id:doc.id,
              ...data,
              department: dept
            })
          })
        }

        setTickets(allTickets);
      }catch(e){
        console.error('Error fetching Tickets',e.message);
      }
    }
    fetchTicketinfo()

    fetchUserinfo();
  }, []);


    const downloadCSV = (tickets) =>{
      const headers = ["Ticket ID", 'Department', 'Title', "Status", "Created At", "User Email"];
      const rows = tickets.map(ticket=>
      [
        ticket.id,
        `${ticket.department}`,
        ticket.title,
        ticket.status,
        new Date(ticket.createdAt?.seconds * 1000).toISOString(),
        ticket.userEmail
      ]
      );
  
      let csvContent = [headers, ...rows].map(e=>e.join(',')).join('\n');
      const blob = new Blob([csvContent], {type:'text/csv'});
      const url = URL.createObjectURL(blob);
  
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tickets.csv';
      link.click();
      URL.revokeObjectURL(url);
    }

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (e) {
      console.error("Sign Out Error: ", e.message);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-10">
      <nav className="fixed top-0 left-0 right-0 flex justify-between px-4 py-2 mx-auto z-50 bg-gray-300 shadow-md backdrop-blur-md bg-opacity-100 items-center">
        <button className="text-red-500 font-semibold text-xl hover:text-red-400 cursor-pointer">
          AG HelpDesk
        </button>
        <div className="flex flex-row gap-4 items-center">
          
          <button
            onClick={handleSignOut}
            className="cursor-pointer bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 hover:text-gray-200"
          >
            <FaSignOutAlt className="text-2xl" />
          </button>
          <button
            onClick={() => router.push("/userinfo")}
            className="cursor-pointer bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 hover:text-gray-200"
          >
            <IoPerson className="text-2xl" />
          </button>
          <button
            onClick={() => downloadCSV(tickets)}
            className="cursor-pointer bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 hover:text-gray-200"
          >
            <FaFileDownload className="text-2xl" />
          </button>
        </div>
      </nav>
      <div className="flex-col p-4 max-w-4xl mx-auto gap-2 pt-20">
        <h1 className="text-3xl font-bold text-gray-500 text-shadow-md text-center">Hi, {name}</h1>
        <h1 className="text-red-500 text-shadow-sm text-3xl font-semibold text-center mb-5">Raise and Handle</h1>
        <TicketForm />
        <h1 className="text-black text-shadow-md font-bold text-3xl text-center mt-5">
          Handle {tickDepartment} Tickets
        </h1>
        <TicketListSpecific />
      </div>
    </div>
  );
}
