import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Background from './components/Background';
import Nav from './components/Nav';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LangProvider } from './context/LangContext';
import Landing from './pages/Landing';
import Discover from './pages/Discover';
import Calle from './pages/Calle';
import Calenton from './pages/Calenton';
import Chats from './pages/Chats';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

function Protected({ children }) {
 const { user, loading } = useAuth();
 if (loading) return <div className="page" style={{display:'grid',placeItems:'center'}}><div className="brand"><span className="brand-mark"><i/></span>Palacalle</div></div>;
 if (!user) return <Navigate to="/" replace />;
 return children;
}

function OwnerOnly({ children }) {
 const { effectiveOwner, loading } = useAuth();
 if (loading) return null;
 if (!effectiveOwner) return <Navigate to="/app" replace />;
 return children;
}


function EventBanner() {
  const [ev, setEv] = useState(null);
  useEffect(()=>{ (async()=>{
    try{
      const now=new Date().toISOString();
      const { supabase } = await import('./lib/supabase');
      const { data } = await supabase.from('event_schedule').select('*').eq('is_active',true).lte('starts_at',now).order('created_at',{ascending:false}).limit(5);
      const active=(data||[]).find(e=>!e.ends_at || e.ends_at>=now);
      setEv(active||null);
    }catch{}
  })(); },[]);
  if(!ev) return null;
  return <div style={{position:'fixed',top:'calc(64px + var(--safe-top))',left:'50%',transform:'translateX(-50%)',zIndex:95,width:'min(92vw,680px)'}}><div className="glass" style={{padding:'10px 14px',borderRadius:14,display:'flex',gap:10,alignItems:'center',borderColor:'rgba(212,160,23,.28)'}}><span style={{width:8,height:8,borderRadius:999,background:'var(--laca)',boxShadow:'0 0 0 4px rgba(212,160,23,.18)'}}></span><div style={{fontSize:'.82rem'}}><b style={{color:'#F2C94C'}}>Evento activo:</b> {ev.title}</div></div></div>;
}
function Shell() {
 const loc = useLocation();
 const { user } = useAuth();
 const inApp = loc.pathname.startsWith('/app');
 useEffect(()=>{
   if(!inApp || !user) return;
   const k='pc_cleanup_at';
   const last=Number(localStorage.getItem(k)||0);
   if(Date.now()-last < 60*60*1000) return;
   localStorage.setItem(k,String(Date.now()));
   import('./lib/supabase').then(({supabase})=>supabase.rpc('cleanup_daily')).catch(()=>{});
 },[inApp,user?.id]);
 return (
  <div className="app-shell">
   <Background />
   <div className="bg-veil" />
      {inApp && user && <EventBanner />}
   <AnimatePresence mode="wait">
    <motion.div key={loc.pathname} initial={{opacity:0, y:12, filter:'blur(6px)'}} animate={{opacity:1, y:0, filter:'blur(0px)'}} exit={{opacity:0, y:-8, filter:'blur(4px)'}} transition={{duration:0.42, ease:[0.22,1,0.36,1]}} style={{position:'relative',zIndex:1}}>
     <Routes location={loc}>
      <Route path="/" element={user ? <Navigate to="/app" replace /> : <Landing />} />
      <Route path="/app" element={<Protected><Discover /></Protected>} />
      <Route path="/app/calle" element={<Protected><Calle /></Protected>} />
      <Route path="/app/calenton" element={<Protected><Calenton /></Protected>} />
      <Route path="/app/chats" element={<Protected><Chats /></Protected>} />
      <Route path="/app/perfil" element={<Protected><Profile /></Protected>} />
      <Route path="/app/groups" element={<Navigate to="/app" replace />} />
      <Route path="/app/admin" element={<Protected><OwnerOnly><Admin /></OwnerOnly></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
     </Routes>
    </motion.div>
   </AnimatePresence>
   {inApp && user && <Nav />}
  </div>
 );
}

export default function App() {
 return (
  <LangProvider>
   <ToastProvider>
    <AuthProvider>
     <Shell />
    </AuthProvider>
   </ToastProvider>
  </LangProvider>
 );
}
