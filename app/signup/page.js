"use client"
import { auth, db } from "@/firebase/config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Nunito } from "next/font/google";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { IoMailOutline, IoLockClosedOutline } from "react-icons/io5";


const nunito = Nunito({
  subsets:['latin'],
  weight:['400','600','700','500'],
  display:'swap'
})

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confPassword, setConfPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();


  const handleSignup = async (e) => {
    setLoading(true);
    e.preventDefault();
    if(password!=confPassword){
      alert('Both Password fields should match!')
      return;
    }
 
      try {
        const userCred = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        await setDoc(doc(db, 'users', userCred.user.uid),{
          email,
          role:'issuer',
        });
        router.push('/userinfo')
      } catch (e) {
        alert(e.message);
      }
    setLoading(false);
  };


  return(
        <div className="min-h-screen flex items-center justify-center bg-white">
          {/* Title */}
          <div className="flex flex-col ">
            <div className="flex flex-col items-center mb-6 gap-6">
              <h1 className={`${nunito.className} text-red-800 text-4xl font-extrabold text-center tracking-wide`}>
                AG Help Desk
              </h1>
              <img src="/AGLOGO.png" className="h-32 w-auto" alt="AG Logo" />
            </div>
    
            {/* FORM WRAPPER */}
            <div className="w-full max-w-md border border-red-500 rounded-xl p-8 shadow-lg justify-center items-center">
              <h2 className="text-3xl font-bold text-red-600 text-center mb-6">
                Sign Up
              </h2>
    
              <form onSubmit={handleSignup} className="space-y-5">
                <div className="relative">
                  <IoMailOutline className="absolute top-1/2 left-3 transform -translate-y-1/2 text-red-400 text-xl" />
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full pl-10 px-4 py-2 text-black border-red-400 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-300 placeholder:text-neutral-600"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="relative">
                  <IoLockClosedOutline className="absolute top-1/2 left-3 transform -translate-y-1/2 text-red-400 text-xl" />
                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full  pl-10 px-4 py-2 text-black border-red-400 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-300 placeholder:text-neutral-600"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="relative">
                  <IoLockClosedOutline className="absolute top-1/2 left-3 transform -translate-y-1/2 text-red-400 text-xl" />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    className="w-full  pl-10 px-4 py-2 text-black border-red-400 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-300 placeholder:text-neutral-600"
                    value={confPassword}
                    onChange={(e) => setConfPassword(e.target.value)}
                    required
                  />
                </div>
    
                <button
                  type="submit"
                  className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-400 transition cursor-pointer"
                >
                  {loading ? (
                    <div className="flex justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
    
                <p className="mt-6 text-sm text-center text-gray-600">
                  Already have an account?{' '}
                  <a
                    href="/login"
                    className="text-red-600 hover:underline"
                  >
                    Login
                  </a>
                </p>
              </form>
            </div>
          </div>
        </div>
  )
}
