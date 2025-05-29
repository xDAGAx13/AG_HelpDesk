"use client";
import { auth, db } from "@/firebase/config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function UserInfoPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roleInCompany, setRoleInCompany] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false)

useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    if (user) {
      try {
        const userinfosnap = await getDoc(doc(db, "users", user.uid));
        if (userinfosnap.exists()) {
          const infodata = userinfosnap.data();
          setName(infodata.name || '');
          setRoleInCompany(infodata.roleInCompany || '');
          setDepartment(infodata.department || '');
        }
      } catch (e) {
        console.error('Cannot fetch userinfo: ', e.message);
      }
    } else {
      router.push("/login"); // fallback if not authenticated
    }
  });

  return () => unsubscribe();
}, []);


  const handleSubmit = async (e) => {
    setLoading(true);
    e.preventDefault();
    try{
    const user = auth.currentUser;
    const uid = user.uid;
    if (!uid) return alert("User not found");

   
    await updateDoc(
      doc(db, "users", uid),
      {
        name,
        roleInCompany,
        department,
        email: user.email,
      },
      { merge: true }
    );

    const infodata = (await getDoc(doc(db,'users',user.uid))).data();
    const userRole = infodata.role;
    if(userRole==='handler'){
      router.push('/role/handler')
    }else{
    router.push("/role/issuer");
    }
  }catch(e){
    console.error('Cannot Save UserInfo: ',e.message);
  }finally{
    setLoading(false);
  }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <form
        onSubmit={handleSubmit}
        className="max-w-md w-full border border-red-500 p-6 rounded-lg shadow space-y-4"
      >
        <h2 className="text-xl font-bold text-center text-red-600">
          Complete Your Profile
        </h2>

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border px-3 py-2 rounded text-neutral-700"
          required
        />

        <input
          type="text"
          placeholder="Your Role in Company"
          value={roleInCompany}
          onChange={(e) => setRoleInCompany(e.target.value)}
          className="w-full border px-3 py-2 rounded text-neutral-700"
          required
        />

        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          required
          className="w-full border px-3 py-2 rounded text-neutral-700"
        >
          <option value="">Select Department</option>
          <option value="IT">IT</option>
          <option value="HR">HR</option>
          <option value="Accounts">Accounts</option>
          <option value="Sales">Sales</option>
        </select>

        
        <button
          type="submit"
          className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 cursor-pointer"
        >
          {loading ? (
                    <div className="flex justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <span>Save and Continue</span>
                  )}
        </button>
      </form>
    </div>
  );
}
