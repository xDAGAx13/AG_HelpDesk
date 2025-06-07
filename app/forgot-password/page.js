'use client'
import { auth } from '@/firebase/config';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleResetPassword = async (e)=>{
    e.preventDefault();
    try{
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent!'); 
    }catch(e){
      setMessage('error.message');
    }
  }
  return (
    <div className='min-h-screen flex items-center justify-center bg-white'>
      <form onSubmit={handleResetPassword} className='w-full max-w-sm p-6 border border-red-600 rounded shadow-xl'>
        <h2 className='text-xl font-bold mb-4 text-red-600 text-center'>Forgot Password</h2>
        <input 
        type='email'
        placeholder='Enter your email'
        value = {email}
        onChange={(e)=>setEmail(e.target.value)}
        required
        className='border-red-500 text-black placeholder:text-gray-400 w-full px-4 py-2 mb-4 border rounded'
        />
        <button className='cursor-pointer w-full bg-red-500 text-white py-2 rounded hover:bg-red-400'>Send Reset Link</button>
        {message && <p  className=' mt-4 font-semibold text-sm text-center text-green-400'>{message}</p>}
        <p className='mt-5 text-center text-sm text-black'>Click <button onClick={()=>router.push('/login')} className='hover:underline cursor-pointer text-red-600'>here</button> to go back to the login page</p>
      </form>
      

    </div>
  )
}
