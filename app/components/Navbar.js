"use client";
import { FaSignOutAlt } from "react-icons/fa";
import { IoPerson } from "react-icons/io5";
import { useRouter } from "next/navigation";

export default function Navbar({ onSignOut, loading, children }) {
  const router = useRouter();

  return (
    <nav className="fixed top-0 left-0 right-0 flex justify-between px-4 py-2 mx-auto z-50 bg-gray-300 shadow-md backdrop-blur-md bg-opacity-100 items-center">
      <button className="text-red-500 font-semibold text-xl hover:text-red-400 cursor-pointer">
        AG HelpDesk
      </button>
      <div className="flex flex-row gap-4 items-center">
        <button
          onClick={onSignOut}
          className="cursor-pointer bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 hover:text-gray-200"
        >
          {loading ? (
            <div className="flex justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <FaSignOutAlt className="text-2xl" />
          )}
        </button>
        <button
          onClick={() => router.push("/userinfo")}
          className="cursor-pointer bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 hover:text-gray-200"
        >
          <IoPerson className="text-2xl" />
        </button>
        {children}
      </div>
    </nav>
  );
}
