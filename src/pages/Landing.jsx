import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { APP_NAME, APP_TAGLINE } from '../lib/config';
import Beam from '../components/Beam';

export default function Landing() {
 const { push } = useToast();
 const [sp] = useSearchParams();
 useEffect(()=>{ const ref=(sp.get('ref')||'').trim().toUpperCase(); if(ref){ localStorage.setItem('pc_ref',ref); supabase.from('affiliate_hits').insert({affiliate_code:ref, visitor_fp:navigator.userAgent.slice(0,60)}).then(()=>{}); } },[sp]);
 const [mode, setMode] = useState('login'); // login | register
 const [method, setMethod] = useState('email'); // email | phone
 const [email, setEmail] = useState('');
 const [phone, setPhone] = useState('');
 const [password, setPassword] = useState('');
 const [name, setName] = useState('');
 const [loading, setLoading] = useState(false);

 const submit = async (e) => {
  e.preventDefault(); setLoading(true);
  try {
   if (mode === 'register') {
    const meta = { display_name: name || 'Nuevo miembro', referred_by: (localStorage.getItem('pc_ref')||'') };
    let res;
    if (method === 'phone') {
     const ph = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g,'')}`;
     res = await supabase.auth.signUp({ phone: ph, password, options: { data: meta } });
    } else {
     res = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: meta } });
    }
    if (res.error) throw res.error;
    push('Bienvenido a Palacalle. Tu historia empieza aquí.', 'ok');
   } else {
    let res;
    if (method === 'phone') {
     const ph = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g,'')}`;
     res = await supabase.auth.signInWithPassword({ phone: ph, password });
    } else {
     res = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    }
    if (res.error) throw res.error;
    push('Entraste. La calle te estaba esperando.', 'ok');
   }
  } catch (err) {
   push(err.message || 'No pudimos entrar. Intenta de nuevo.', 'err');
  } finally { setLoading(false); }
 };

 return (
  <div className="page" style={{display:'grid',alignItems:'center',minHeight:'100dvh',paddingBottom:'40px'}}>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:28,alignItems:'center',width:'100%'}}>
    <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:.7,ease:[.22,1,.36,1]}}>
     <div className="eyebrow">Conexiones reales · Cuba × Mundo</div>
     <h1 className="h1" style={{marginBottom:18}}>Donde Cuba <em>se cruza</em> contigo.</h1>
     <p className="sub" style={{marginBottom:28}}>
      Palacalle es el punto de encuentro entre cubanos y personas de Europa, EE. UU. y Latinoamérica que quieren algo más que un swipe vacío. Elegante, cercano, real.
     </p>
     <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
      <span className="chip chip-live">En vivo ahora</span>
      <span className="chip">Modo Calentón</span>
      <span className="chip">Susurros</span>
      <span className="chip">La Calle 20:00–05:00</span>
     </div>
    </motion.div>

    <motion.div initial={{opacity:0,y:30,scale:.98}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.7,delay:.08,ease:[.22,1,.36,1]}}>
     <Beam size="md" colorVariant="sunset" strength={0.55}>
      <div className="glass-strong" style={{padding:28,borderRadius:28}}>
       <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
        <div className="brand-mark"><i/></div>
        <div>
         <div style={{fontWeight:700,fontSize:'1.15rem',letterSpacing:'-.02em'}}>{APP_NAME}</div>
         <div style={{fontSize:'.75rem',color:'var(--pearl-muted)'}}>{APP_TAGLINE}</div>
        </div>
       </div>

       <div style={{display:'flex',gap:8,marginBottom:18}}>
        {['login','register'].map(m => (
         <button key={m} onClick={()=>setMode(m)} className={`btn btn-sm ${mode===m?'btn-primary':'btn-glass'}`} style={{flex:1}}>
          {m==='login'?'Entrar':'Crear cuenta'}
         </button>
        ))}
       </div>

       <div style={{display:'flex',gap:8,marginBottom:18}}>
        {['email','phone'].map(m => (
         <button key={m} onClick={()=>setMethod(m)} className={`chip ${method===m?'chip-laca':''}`} style={{cursor:'pointer',borderStyle:'solid'}}>
          {m==='email'?'Correo':'Teléfono'}
         </button>
        ))}
       </div>

       <form onSubmit={submit}>
        {mode==='register' && (
         <div className="field"><label>Tu nombre</label><input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Cómo te llamas en la calle" required /></div>
        )}
        {method==='email' ? (
         <div className="field"><label>Correo</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@correo.com" required /></div>
        ) : (
         <div className="field"><label>Teléfono</label><input className="input" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+1 555 000 0000" required /></div>
        )}
        <div className="field"><label>Contraseña</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required /></div>
        <button className="btn btn-primary" style={{width:'100%',marginTop:8}} disabled={loading}>
         {loading ? 'Un momento...' : mode==='login' ? 'Entrar a Palacalle' : 'Crear mi cuenta'}
        </button>
       </form>
       <p style={{fontSize:'.72rem',color:'var(--pearl-muted)',marginTop:14,lineHeight:1.6,textAlign:'center'}}>
        Al entrar aceptas vibra buena, respeto y consentimiento. Lo demás lo pone la calle.
       </p>
      </div>
     </Beam>
    </motion.div>
   </div>
  </div>
 );
}
