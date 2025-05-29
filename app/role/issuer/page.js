'use client'
import React, { useEffect, useState } from 'react'
import { getAuth, signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import TicketForm from './components/TicketForm'
import TicketList from './components/TicketList'
import { IoPerson } from 'react-icons/io5'
import { FaSignOutAlt } from 'react-icons/fa'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'

export default function IssuerPage() {
  const router = useRouter()
  const auth = getAuth()
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');

  useEffect(()=>{
    const fetchUserinfo = async ()=>{
      try{
        const user = auth.currentUser;
        if(!user) console.error('User Not Signed In')
        const userinfosnap = await getDoc(doc(db,'users',user.uid))
        if(userinfosnap.exists()){
          const username = userinfosnap.data().name
          const firstname = username.split(" ")[0]
          setName(firstname);
        }
      }catch(e){
        alert('Cannot Fetch Username:')
      }
    }
    fetchUserinfo();
  },[])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }


  return (
    <div className='bg-white'>
      <nav className='fixed top-0 left-0 right-0 flex justify-between px-4 py-2 mx-auto z-50 bg-gray-300 shadow-md backdrop-blur-md bg-opacity-100 items-center'>
        <button className='text-red-500 font-semibold text-xl hover:text-red-400 cursor-pointer'>AG HelpDesk</button>
        <div className='flex flex-row gap-4'>
        <button
          onClick={handleSignOut}
          className='cursor-pointer bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 hover:text-gray-200'
        >
          <FaSignOutAlt className='text-2xl'/>
        </button>
        <button onClick={()=>router.push('../userinfo')} className='cursor-pointer bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 hover:text-gray-200'>
          <IoPerson className='text-2xl' />
        </button>
        </div>
      </nav>
      <div className='p-4 max-w-3xl mx-auto bg-white mt-14'>
        <h1 className='text-3xl font-bold text-center text-gray-600 text-shadow-md'>Hi, {name}</h1>
        <h1 className='text-3xl font-bold mb-6 text-shadow-sm text-red-500 text-center'>Raise A Ticket</h1>
        <TicketForm />
        <h2 className='text-2xl text-center font-semibold mt-10 text-shadow-md text-black'>Your Tickets</h2>
        <TicketList />
      </div>
    </div>
  )
}
