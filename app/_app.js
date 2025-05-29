import { AuthProvider } from '@/context/AuthContext'
import React from 'react'

export default function App({Component, pageProps}) {
  return (
    <AuthProvider>
      <Component{...pageProps}/>
    </AuthProvider>
  )
}

