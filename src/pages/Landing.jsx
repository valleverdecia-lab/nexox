import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { APP_NAME, APP_TAGLINE } from '../lib/config';
import { useLang } from '../context/LangContext';
import Beam from '../components/Beam';

export default function Landing() {
 const { push } = useToast();
 const { t } = useLang();
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
     <div className="eyebrow">{t("landing_eyebrow")}</div>
     <h1 className="h1" style={{marginBottom:18}}>{t("landing_title_a")}<em>{t("landing_title_b")}</em>{t("landing_title_c")}</h1>
     <p className="sub" style={{marginBottom:28}}>
      {t("landing_sub")}
     </p>
     <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
      <span className="chip chip-live">{t("landing_live")}</span>
      <span className="chip">Modo Calentón</span>
      <span className="chip">{t("landing_whispers")}</span>
      <span className="chip">{t("landing_street")}</span>
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
          {m==='login'?t('login'):t('register')}
         </button>
        ))}
       </div>

       <div style={{display:'flex',gap:8,marginBottom:18}}>
        {['email','phone'].map(m => (
         <button key={m} onClick={()=>setMethod(m)} className={`chip ${method===m?'chip-laca':''}`} style={{cursor:'pointer',borderStyle:'solid'}}>
          {m==='email'?t('email'):t('phone')}
         </button>
        ))}
       </div>

       <form onSubmit={submit}>
        {mode==='register' && (
         <div className="field"><label>{t("name")}</label><input className="input" value={name} onChange={e=>setName(e.target.value.slice(0,40))} placeholder={t('name_ph')} maxLength={40} required /></div>
        )}
        {method==='email' ? (
         <div className="field"><label>{t("email")}</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@correo.com" maxLength={120} required /></div>
        ) : (
         <div className="field"><label>{t("phone")}</label><input className="input" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+1 555 000 0000" maxLength={20} required /></div>
        )}
        <div className="field"><label>{t("password")}</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={t('pass_ph')} minLength={6} maxLength={72} required /></div>
        <button className="btn btn-primary" style={{width:'100%',marginTop:8}} disabled={loading}>
         {loading ? t('loading') : mode==='login' ? t('enter') : t('create_account')}
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
