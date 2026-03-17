'use client'
import { functions } from '@/firebase/config';
import { httpsCallable } from 'firebase/functions';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'
import { IoMailOutline } from 'react-icons/io5';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const sendPasswordResetLink = httpsCallable(functions, 'sendPasswordResetLink');
      await sendPasswordResetLink({ email });
      setMessage('Password reset email sent! Please check your inbox.');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-white'>
      <form onSubmit={handleResetPassword} className='w-full max-w-sm p-6 border border-red-600 rounded shadow-xl'>
        <h2 className='text-xl font-bold mb-2 text-red-600 text-center'>Forgot Password</h2>
        <p className='text-sm text-gray-500 text-center mb-4'>Enter your email and we'll send you a reset link.</p>

        <div className='relative mb-4'>
          <IoMailOutline className='absolute top-1/2 left-3 transform -translate-y-1/2 text-red-400 text-xl' />
          <input
            type='email'
            placeholder='Enter your email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className='border-red-500 text-black placeholder:text-gray-400 w-full pl-10 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-300'
          />
        </div>

        <button
          type='submit'
          disabled={loading}
          className='cursor-pointer w-full bg-red-500 text-white py-2 rounded hover:bg-red-400 disabled:opacity-50'
        >
          {loading ? (
            <div className='flex justify-center'>
              <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
            </div>
          ) : (
            'Send Reset Link'
          )}
        </button>

        {message && <p className='mt-4 font-semibold text-sm text-center text-green-500'>{message}</p>}
        {error && <p className='mt-4 font-semibold text-sm text-center text-red-500'>{error}</p>}

        <p className='mt-5 text-center text-sm text-black'>
          Click <button type='button' onClick={() => router.push('/login')} className='hover:underline cursor-pointer text-red-600'>here</button> to go back to the login page
        </p>
      </form>
    </div>
  )
}
