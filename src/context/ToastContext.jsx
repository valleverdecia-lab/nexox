import { createContext, useContext, useState, useCallback } from 'react';
const Ctx = createContext(null);
export const useToast = () => useContext(Ctx);
export function ToastProvider({ children }) {
 const [toasts, setToasts] = useState([]);
 const push = useCallback((msg, type='ok') => {
  const id = Math.random().toString(36).slice(2);
  setToasts(t => [...t, {id,msg,type}]);
  setTimeout(()=> setToasts(t=>t.filter(x=>x.id!==id)), 3200);
 },[]);
 return (
  <Ctx.Provider value={{push}}>
   {children}
   <div className="toast-wrap">
    {toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}
   </div>
  </Ctx.Provider>
 );
}
