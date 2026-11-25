import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { timeAgo } from '../lib/helpers';
import { EVENTS } from '../lib/config';
import Beam from '../components/Beam';

const Ico = ({d,s=18}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;

export default function Admin() {
 const { user } = useAuth();
 const { push } = useToast();
 const [tab, setTab] = useState('users');
 const [users, setUsers] = useState([]);
 const [q, setQ] = useState('');
 const [targetId, setTargetId] = useState('');
 const [days, setDays] = useState('30');
 const [affiliates, setAffiliates] = useState([]);
 const [affName, setAffName] = useState('');
 const [dailyQ, setDailyQ] = useState('');
 const [eventSlug, setEventSlug] = useState(EVENTS[0].slug);
 const [eventTitle, setEventTitle] = useState('');
 const [eventStart, setEventStart] = useState('');
 const [eventEnd, setEventEnd] = useState('');
 const [flashTitle, setFlashTitle] = useState('');
 const [flashPrompt, setFlashPrompt] = useState('');
 const [flashMinutes, setFlashMinutes] = useState('15');
 const [flashReward, setFlashReward] = useState('');
 const [inspect, setInspect] = useState(null);
 const [inspectMatches, setInspectMatches] = useState([]);
 const [inspectThread, setInspectThread] = useState([]);
 const [inspectMatchId, setInspectMatchId] = useState(null);
 const [reports, setReports] = useState([]);

 const loadUsers = async () => {
  const { data, error } = await supabase.rpc('admin_list_users', { q: q || '' });
  if(error) { push(error.message,'err'); return; }
  setUsers(data||[]);
 };
 const loadAff = async () => {
  const { data: aff } = await supabase.from('affiliates').select('*').order('created_at',{ascending:false});
  const list = aff||[];
  const enriched = await Promise.all(list.map(async a => {
   const { count: hits } = await supabase.from('affiliate_hits').select('*',{count:'exact',head:true}).eq('affiliate_code',a.code);
   const { count: conv } = await supabase.from('affiliate_conversions').select('*',{count:'exact',head:true}).eq('affiliate_code',a.code);
   return { ...a, hits:hits||0, conversions:conv||0 };
  }));
  setAffiliates(enriched);
 };
 const loadReports = async () => { const { data } = await supabase.from('reports').select('*').order('created_at',{ascending:false}).limit(50); setReports(data||[]); };
 useEffect(()=>{ loadUsers(); loadAff(); loadReports(); },[]);
 useEffect(()=>{ const t=setTimeout(loadUsers,300); return ()=>clearTimeout(t); },[q]);

 const grant = async () => { if(!targetId) return; const { error } = await supabase.rpc('admin_grant_premium', { target: targetId.trim(), days: parseInt(days||'30') }); if(error) push(error.message,'err'); else { push('Premium activado','ok'); loadUsers(); } };
 const revoke = async () => { if(!targetId) return; const { error } = await supabase.rpc('admin_revoke_premium', { target: targetId.trim() }); if(error) push(error.message,'err'); else { push('Premium retirado','ok'); loadUsers(); } };
 const ban = async (id) => { const { error } = await supabase.rpc('admin_ban', { target:id, reason:'admin' }); if(error) push(error.message,'err'); else { push('Usuario baneado','ok'); loadUsers(); } };
 const unban = async (id) => { const { error } = await supabase.rpc('admin_unban', { target:id }); if(error) push(error.message,'err'); else { push('Usuario desbaneado','ok'); loadUsers(); } };
 const delUser = async (id) => { if(!confirm('Eliminar cuenta definitivamente?')) return; const { error } = await supabase.rpc('admin_delete_user', { target:id }); if(error) push(error.message,'err'); else { push('Cuenta eliminada','ok'); loadUsers(); } };
 const setGroupPerm = async (id, allowed) => { const { error } = await supabase.rpc('admin_set_group_permission', { target:id, allowed }); if(error) push(error.message,'err'); else { push(allowed?'Creación de grupo habilitada':'Permiso retirado','ok'); loadUsers(); } };

 const createAff = async () => {
  if(!affName.trim()) return;
  const code = affName.trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12) + Math.random().toString(36).slice(2,6).toUpperCase();
  const { error } = await supabase.from('affiliates').insert({ name: affName.trim(), code, created_by: user.id });
  if(error) push(error.message,'err'); else { push('Afiliado creado','ok'); setAffName(''); loadAff(); }
 };

 const setQuestion = async () => {
  if(!dailyQ.trim()) return;
  const today = new Date().toISOString().slice(0,10);
  const { error } = await supabase.from('daily_questions').insert({ question: dailyQ.trim(), active_date: today, created_by: user.id });
  if(error) push(error.message,'err'); else { push('Pregunta del día publicada','ok'); setDailyQ(''); }
 };

 const scheduleEvent = async () => {
  const ev = EVENTS.find(e=>e.slug===eventSlug);
  const title = eventTitle.trim() || ev?.title || eventSlug;
  const starts = eventStart ? new Date(eventStart).toISOString() : new Date().toISOString();
  const ends = eventEnd ? new Date(eventEnd).toISOString() : null;
  const { error } = await supabase.from('event_schedule').insert({ event_slug:eventSlug, title, scheduled_for: starts.slice(0,10), starts_at: starts, ends_at: ends, is_active:true, created_by:user.id, banner_text: title });
  if(error) { push(error.message,'err'); return; }
  await supabase.rpc('admin_notify_all', { p_title: `Evento: ${title}`, p_body: `Ya está activo. Entra a La Calle y participa.`, p_type:'event' });
  push('Evento creado y notificado','ok'); setEventTitle('');
 };

 const createFlash = async () => {
  if(!flashPrompt.trim()) return push('Escribe el reto','err');
  const mins = Math.max(5, Math.min(60, parseInt(flashMinutes||'15')));
  const starts = new Date().toISOString();
  const ends = new Date(Date.now()+mins*60000).toISOString();
  const { error } = await supabase.from('flash_challenges').insert({ title: flashTitle.trim()||'Reto relámpago', prompt: flashPrompt.trim(), starts_at: starts, ends_at: ends, created_by:user.id, is_active:true, reward_text: flashReward.trim() });
  if(error){ push(error.message,'err'); return; }
  await supabase.rpc('admin_notify_all', { p_title: 'Reto relámpago en La Calle', p_body: flashTitle.trim()||'Tienes minutos para entrar.', p_type:'event' });
  push('Reto relámpago lanzado','ok'); setFlashTitle(''); setFlashPrompt(''); setFlashReward('');
 };

 const openInspect = async (p) => {
  setInspect(p); setInspectThread([]); setInspectMatchId(null);
  const { data: ms } = await supabase.from('matches').select('*').or(`user_a.eq.${p.id},user_b.eq.${p.id}`).order('created_at',{ascending:false});
  const list = ms||[];
  const otherIds = list.map(m=>m.user_a===p.id?m.user_b:m.user_a);
  let profs=[]; if(otherIds.length){ const {data}=await supabase.from('profiles').select('id,display_name').in('id',otherIds); profs=data||[]; }
  const map = Object.fromEntries(profs.map(x=>[x.id,x]));
  setInspectMatches(list.map(m=>({ ...m, other: map[m.user_a===p.id?m.user_b:m.user_a] })));
 };
 const openThread = async (m) => {
  setInspectMatchId(m.id);
  const { data } = await supabase.from('messages').select('*').eq('match_id', m.id).order('created_at',{ascending:true}).limit(300);
  setInspectThread(data||[]);
 };

 const cleanup = async () => { const { error } = await supabase.rpc('cleanup_daily'); if(error) push(error.message,'err'); else push('Limpieza ejecutada','ok'); };

 return (
  <div className="page" style={{paddingTop:'calc(90px + var(--safe-top))'}}>
   <div className="topbar"><div className="topbar-inner"><div className="brand"><span className="brand-mark"><i/></span>Admin</div><span className="chip chip-laca">Owner</span></div></div>
   <div className="page-header"><div><div className="eyebrow">Panel Owner</div><h1 className="h2">Control de <span style={{fontStyle:'italic',color:'#F2C94C'}}>Palacalle</span></h1></div></div>

   <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
    {[['users','Usuarios'],['premium','Premium'],['aff','Afiliados'],['events','Eventos'],['reports','Reportes']].map(([k,l])=>(
     <button key={k} className={`btn btn-sm ${tab===k?'btn-primary':'btn-glass'}`} onClick={()=>setTab(k)}>{l}</button>
    ))}
    <button className="btn btn-sm btn-glass" onClick={cleanup}>Limpiar 24h</button>
    <button className="btn btn-sm btn-glass" onClick={async()=>{ const {data,error}=await supabase.rpc('cleanup_inactive_users'); if(error) push(error.message,'err'); else { push(`Usuarios inactivos eliminados: ${data}`,'ok'); loadUsers(); } }}>Purgar inactivos 7d</button>
   </div>

   {tab==='premium' && (
    <Beam size="md" colorVariant="mono" strength={0.45}><div className="glass" style={{padding:20,marginBottom:16}}>
     <h3 style={{fontWeight:700,marginBottom:12}}>Dar / quitar Premium</h3>
     <div className="field"><label>ID de usuario</label><input className="input" value={targetId} onChange={e=>setTargetId(e.target.value)} placeholder="uuid del usuario" /></div>
     <div className="field"><label>Días</label><input className="input" type="number" value={days} onChange={e=>setDays(e.target.value)} /></div>
     <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="btn btn-primary" onClick={grant}>Activar Premium</button><button className="btn btn-glass" onClick={revoke}>Quitar Premium</button></div>
    </div></Beam>
   )}

   {tab==='aff' && (
    <div className="glass" style={{padding:20,marginBottom:16}}>
     <h3 style={{fontWeight:700,marginBottom:12}}>Afiliados</h3>
     <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
      <input className="input" style={{flex:'1 1 220px'}} value={affName} onChange={e=>setAffName(e.target.value)} placeholder="Nombre del afiliado" />
      <button className="btn btn-primary btn-sm" onClick={createAff}>Crear link</button>
     </div>
     <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {affiliates.map(a=>(
       <div key={a.id} className="glass-dark" style={{padding:14,borderRadius:16}}>
        <div style={{fontWeight:600}}>{a.name} <span style={{color:'var(--pearl-muted)',fontSize:'.8rem'}}>({a.code})</span></div>
        <div style={{fontSize:'.8rem',color:'var(--pearl-dim)',marginTop:4}}>Entradas: {a.hits} · Compras: {a.conversions}</div>
        <div style={{fontSize:'.75rem',color:'#F2C94C',marginTop:6,wordBreak:'break-all'}}>{location.origin}/?ref={a.code}</div>
       </div>
      ))}
      {affiliates.length===0 && <p style={{color:'var(--pearl-muted)'}}>Sin afiliados aún.</p>}
     </div>
    </div>
   )}

   {tab==='events' && (
    <div className="glass" style={{padding:20,marginBottom:16}}>
     <h3 style={{fontWeight:700,marginBottom:12}}>Pregunta del día</h3>
     <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
      <input className="input" style={{flex:'1 1 220px'}} value={dailyQ} onChange={e=>setDailyQ(e.target.value)} placeholder="Escribe la pregunta..." />
      <button className="btn btn-primary btn-sm" onClick={setQuestion}>Publicar</button>
     </div>
     <h3 style={{fontWeight:700,marginBottom:12}}>Crear evento</h3>
     <div className="field"><label>Tipo</label><select className="input" value={eventSlug} onChange={e=>setEventSlug(e.target.value)}>{EVENTS.map(ev=><option key={ev.slug} value={ev.slug}>{ev.title}</option>)}</select></div>
     <div className="field"><label>Nombre personalizado</label><input className="input" value={eventTitle} onChange={e=>setEventTitle(e.target.value)} placeholder="Opcional" /></div>
     <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
      <div className="field"><label>Inicio</label><input className="input" type="datetime-local" value={eventStart} onChange={e=>setEventStart(e.target.value)} /></div>
      <div className="field"><label>Fin</label><input className="input" type="datetime-local" value={eventEnd} onChange={e=>setEventEnd(e.target.value)} /></div>
     </div>
     <button className="btn btn-primary" onClick={scheduleEvent}>Crear y notificar</button>

     <hr style={{border:'none',borderTop:'1px solid rgba(255,255,255,.08)',margin:'20px 0'}} />
     <h3 style={{fontWeight:700,marginBottom:12}}>Reto relámpago (15 min)</h3>
     <div className="field"><label>Título</label><input className="input" value={flashTitle} onChange={e=>setFlashTitle(e.target.value)} placeholder="Ej: Confiesa en 1 línea" /></div>
     <div className="field"><label>Reto / prompt</label><textarea className="input" value={flashPrompt} onChange={e=>setFlashPrompt(e.target.value)} placeholder="¿Qué tiene que hacer la gente?" /></div>
     <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
      <div className="field"><label>Duración (min)</label><input className="input" type="number" value={flashMinutes} onChange={e=>setFlashMinutes(e.target.value)} /></div>
      <div className="field"><label>Recompensa (texto)</label><input className="input" value={flashReward} onChange={e=>setFlashReward(e.target.value)} placeholder="Ej: destaque en La Calle" /></div>
     </div>
     <button className="btn btn-primary" onClick={createFlash}>Lanzar reto relámpago</button>
    </div>
   )}

   {tab==='reports' && (
    <div className="glass" style={{padding:20}}><h3 style={{fontWeight:700,marginBottom:12}}>Reportes</h3>
     {reports.length===0 ? <p style={{color:'var(--pearl-muted)'}}>Sin reportes.</p> : reports.map(r=><div key={r.id} className="glass-dark" style={{padding:12,borderRadius:12,marginBottom:8}}><div style={{fontSize:'.82rem'}}><b>{r.reporter_id}</b> → <b>{r.target_id}</b></div><div style={{color:'var(--pearl-dim)',fontSize:'.8rem'}}>{r.reason}</div></div>)}
    </div>
   )}

   {tab==='users' && (
    <>
     <div className="field"><input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nombre, email, teléfono o ID..." /></div>
     <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {users.map(u => (
       <div key={u.id} className="glass" style={{padding:14}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'flex-start',flexWrap:'wrap'}}>
         <div style={{minWidth:0,flex:'1 1 240px'}}>
          <div style={{fontWeight:600,display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>{u.display_name||'Sin nombre'} {u.role==='owner'&&<span className="chip chip-laca">owner</span>}</div>
          <div style={{fontSize:'.72rem',color:'var(--pearl-muted)',fontFamily:'monospace',wordBreak:'break-all'}}>{u.id}</div>
          <div style={{fontSize:'.8rem',color:'var(--pearl-dim)',marginTop:4}}>{u.email||'-'} · {u.phone||'-'}</div>
          <div style={{fontSize:'.78rem',color:'var(--pearl-dim)',marginTop:2}}>{u.country||'-'} · {u.ciudad||'-'} · activo {timeAgo(u.last_active_at)}</div>
          <div style={{marginTop:6,display:'flex',gap:6,flexWrap:'wrap'}}>
           {u.premium_until && new Date(u.premium_until)>new Date() && <span className="chip chip-laca">premium</span>}
           {u.is_banned && <span className="chip" style={{color:'#ff8a8a'}}>baneado</span>}
           {u.can_create_group && <span className="chip">grupo OF</span>}
          </div>
         </div>
         <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <button className="btn btn-glass btn-sm" onClick={()=>{setTargetId(u.id); setTab('premium');}}>Premium</button>
          <button className="btn btn-glass btn-sm" onClick={()=>openInspect(u)}>Chats</button>
          <button className="btn btn-glass btn-sm" onClick={()=>setGroupPerm(u.id,!u.can_create_group)}>{u.can_create_group?'Quitar OF':'Habilitar OF'}</button>
          {u.role!=='owner' && (u.is_banned ? <button className="btn btn-glass btn-sm" onClick={()=>unban(u.id)}>Desbanear</button> : <button className="btn btn-glass btn-sm" onClick={()=>ban(u.id)}>Banear</button>)}
          {u.role!=='owner' && <button className="btn btn-glass btn-sm" style={{color:'#ff8a8a'}} onClick={()=>delUser(u.id)}>Eliminar</button>}
         </div>
        </div>
       </div>
      ))}
     </div>
    </>
   )}

   {inspect && (
    <div className="modal-overlay" onClick={()=>setInspect(null)}>
     <motion.div className="modal-sheet glass-strong" onClick={e=>e.stopPropagation()} initial={{y:30,opacity:0}} animate={{y:0,opacity:1}} style={{maxWidth:860}}>
      <h3 className="h2" style={{fontSize:'1.5rem',marginBottom:4}}>Chats de {inspect.display_name}</h3>
      <p style={{color:'var(--pearl-muted)',fontSize:'.78rem',marginBottom:14,wordBreak:'break-all'}}>{inspect.id} · {inspect.email||'-'} · {inspect.phone||'-'}</p>
      <div style={{display:'grid',gridTemplateColumns:'minmax(180px,240px) 1fr',gap:12,minHeight:260}}>
       <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:'55vh',overflow:'auto'}}>
        {inspectMatches.length===0 ? <p style={{color:'var(--pearl-muted)',fontSize:'.85rem'}}>Sin matches.</p> : inspectMatches.map(m=>(
         <button key={m.id} className={`glass-dark ${inspectMatchId===m.id?'':''}`} style={{padding:10,borderRadius:12,textAlign:'left',borderColor:inspectMatchId===m.id?'rgba(212,160,23,.5)':undefined}} onClick={()=>openThread(m)}>
          <div style={{fontWeight:600,fontSize:'.85rem'}}>{m.other?.display_name||'Usuario'}</div>
          <div style={{fontSize:'.72rem',color:'var(--pearl-muted)'}}>{timeAgo(m.created_at)}</div>
         </button>
        ))}
       </div>
       <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:'55vh',overflow:'auto',paddingRight:4}}>
        {inspectMatchId ? (inspectThread.length===0 ? <p style={{color:'var(--pearl-muted)'}}>Sin mensajes.</p> : inspectThread.map(m=>(
         <div key={m.id} className="glass-dark" style={{padding:10,borderRadius:12}}>
          <div style={{fontSize:'.72rem',color:'var(--pearl-muted)'}}>{m.sender_id===inspect.id ? (inspect.display_name||'Usuario') : 'Otro'} · {timeAgo(m.created_at)}</div>
          <div style={{fontSize:'.88rem',marginTop:4,whiteSpace:'pre-wrap'}}>{m.body}</div>
         </div>
        ))) : <p style={{color:'var(--pearl-muted)',fontSize:'.85rem'}}>Selecciona un match para leer la conversación.</p>}
       </div>
      </div>
      <button className="btn btn-glass" style={{marginTop:14}} onClick={()=>setInspect(null)}>Cerrar</button>
     </motion.div>
    </div>
   )}
  </div>
 );
}
