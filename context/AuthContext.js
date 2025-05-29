import { db } from "@/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const { createContext, useState, useEffect, useContext } = require("react");

const AuthContext = createContext();


export const AuthProvider = ({children})=>{
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, async(user)=>{
      if(user){
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setUser(user);
        setRole(userDoc.exists()?userDoc.data().role:'issuer');
      }else{
        setUser(null);
        setRole(null);
      }
      setLoading(false)
    })
    return ()=>unsub();
  }, []);

  return(
    <AuthContext.Provider value = {{user, role, loading}}>
      {children}
    </AuthContext.Provider>
  )

};

export const useAuth = ()=>useContext(AuthContext);