"use client";
import { auth, db } from "@/firebase/config";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { redirect, useRouter } from "next/navigation";
import React, { useState } from "react";
import { IoMailOutline, IoLockClosedOutline } from "react-icons/io5";
import { Nunito } from 'next/font/google';

const nunito = Nunito({
  subsets:['latin'],
  weight:['400','600','700','500'],
  display:'swap'
})

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    setLoading(true);
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser
      const userinfoSnap = await getDoc(doc(db,'users',user.uid));
      if(userinfoSnap.exists()){
        const userData = userinfoSnap.data();
        const userRole = userData.role;
        if(userRole==='handler'){
          router.push('/role/handler');
        } else{
          router.push('/role/issuer');
        }
      }
    } catch (error) {
      alert(error.message);
    }
    setLoading(false);
  };

  return (
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
            Login
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
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

            <button
              type="submit"
              className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-400 transition cursor-pointer"
            >
              {loading ? (
                <div className="flex justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <span>Sign-In</span>
              )}
            </button>
            <div className="flex flex-col gap-3">
            <p className="mt-6 text-sm text-center text-gray-600">
              New to the System?{' '}
              <a
                href="/signup"
                className="text-red-600 hover:underline"
              >
                 Sign-Up
              </a>
            </p>
            <p className=" text-sm text-center text-red-600 hover:underline"><a href="/forgot-password">Forgot Password?</a></p>
            </div>
          </form>
        </div>
            <p className="py-10 text-center text-gray-700 text-md font-semibold">Made by Rohan Daga</p>

      </div>
    </div>
  );
}
