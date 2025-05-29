'use client'
import { auth, db } from '@/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { useEffect } from 'react'



export default function Home() {
const [role, setRole] = useState('')
const router = useRouter();

  useEffect(()=>{

    const unsub = onAuthStateChanged(auth,async(user)=>{
      if(user){
        console.log('User is logged in: ',user.email)

        try{
        const userinfoSnap = await getDoc(doc(db, 'users', user.uid))
        if(userinfoSnap.exists()){
          const userRole = userinfoSnap.data().role;
          setRole(userRole);
          if(userRole==='issuer'){
            router.push('/role/issuer');
          }else{
            router.push('/role/handler');
          }
        }else{
          console.warn('No userinfo found, check credentials');
        }
        }catch(e){
          console.error(e.message)
        }
      }else{
        router.push('/login')
      }
    });

    return ()=>unsub();
  },[])

}