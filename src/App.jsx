import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Background from './components/Background';
import Nav from './components/Nav';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Landing from './pages/Landing';
import Discover from './pages/Discover';
import Calle from './pages/Calle';
import Calenton from './pages/Calenton';
import Chats from './pages/Chats';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Groups from './pages/Groups';

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

function Shell() {
  const loc = useLocation();
  const { user } = useAuth();
  const inApp = loc.pathname.startsWith('/app');
  return (
    <div className="app-shell">
      <Background />
      <div className="bg-veil" />
      <AnimatePresence mode="wait">
        <motion.div key={loc.pathname} initial={{opacity:0, y:12, filter:'blur(6px)'}} animate={{opacity:1, y:0, filter:'blur(0px)'}} exit={{opacity:0, y:-8, filter:'blur(4px)'}} transition={{duration:0.42, ease:[0.22,1,0.36,1]}} style={{position:'relative',zIndex:1}}>
          <Routes location={loc}>
            <Route path="/" element={user ? <Navigate to="/app" replace /> : <Landing />} />
            <Route path="/app" element={<Protected><Discover /></Protected>} />
            <Route path="/app/calle" element={<Protected><Calle /></Protected>} />
            <Route path="/app/calenton" element={<Protected><Calenton /></Protected>} />
            <Route path="/app/chats" element={<Protected><Chats /></Protected>} />
            <Route path="/app/perfil" element={<Protected><Profile /></Protected>} />
            <Route path="/app/groups" element={<Protected><Groups /></Protected>} />
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
    <ToastProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ToastProvider>
  );
}
