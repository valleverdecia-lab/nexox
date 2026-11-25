import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { timeAgo } from '../lib/helpers';
import { EVENTS } from '../lib/config';
import Beam from '../components/Beam';

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
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0,10));
  const [inspect, setInspect] = useState(null); // profile
  const [inspectChats, setInspectChats] = useState([]);
  const [reports, setReports] = useState([]);

  const loadUsers = async () => {
    let query = supabase.from('profiles').select('id,display_name,country,ciudad,role,premium_until,is_banned,last_active_at,created_at,last_match_at,last_whisper_at').order('created_at',{ascending:false}).limit(100);
    const { data } = await query; setUsers(data||[]);
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

  const grant = async () => { if(!targetId) return; const { error } = await supabase.rpc('admin_grant_premium', { target: targetId.trim(), days: parseInt(days||'30') }); if(error) push(error.message,'err'); else { push('Premium activado','ok'); loadUsers(); } };
  const revoke = async () => { if(!targetId) return; const { error } = await supabase.rpc('admin_revoke_premium', { target: targetId.trim() }); if(error) push(error.message,'err'); else { push('Premium retirado','ok'); loadUsers(); } };
  const ban = async (id) => { const { error } = await supabase.rpc('admin_ban', { target:id, reason:'admin' }); if(error) push(error.message,'err'); else { push('Usuario baneado','ok'); loadUsers(); } };
  const unban = async (id) => { const { error } = await supabase.rpc('admin_unban', { target:id }); if(error) push(error.message,'err'); else { push('Usuario desbaneado','ok'); loadUsers(); } };

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
    const { error } = await supabase.from('event_schedule').insert({ event_slug:eventSlug, title: eventTitle.trim()||ev?.title||eventSlug, scheduled_for:eventDate, starts_at: new Date(eventDate+'T20:00:00').toISOString(), is_active:true, created_by:user.id, banner_text: eventTitle.trim()||ev?.title||'' });
    if(error) push(error.message,'err'); else { push('Evento programado','ok'); setEventTitle(''); }
  };

  const openInspect = async (p) => {
    setInspect(p);
    // load chats: matches involving this user
    const { data: ms } = await supabase.from('matches').select('*').or(`user_a.eq.${p.id},user_b.eq.${p.id}`);
    const matchIds = (ms||[]).map(m=>m.id);
    if(matchIds.length===0){ setInspectChats([]); return; }
    const { data: msgs } = await supabase.from('messages').select('*').in('match_id', matchIds).order('created_at',{ascending:false}).limit(100);
    setInspectChats(msgs||[]);
  };

  const cleanup = async () => {
    const { error } = await supabase.rpc('cleanup_daily');
    if(error) push(error.message,'err'); else push('Limpieza ejecutada','ok');
  };

  const filtered = users.filter(u => !q || (u.display_name||'').toLowerCase().includes(q.toLowerCase()) || u.id.includes(q));

  return (
    <div className="page" style={{paddingTop:'calc(90px + var(--safe-top))'}}>
      <div className="topbar"><div className="topbar-inner"><div className="brand"><span className="brand-mark"><i/></span>Admin</div><span className="chip chip-ember">Owner</span></div></div>
      <div className="page-header"><div><div className="eyebrow">Panel Owner</div><h1 className="h2">Control de <span style={{fontStyle:'italic',color:'#FFDCCF'}}>Palacalle</span></h1></div></div>

      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
        {[['users','Usuarios'],['premium','Premium'],['aff','Afiliados'],['events','Eventos'],['reports','Reportes']].map(([k,l])=>(
          <button key={k} className={`btn btn-sm ${tab===k?'btn-primary':'btn-glass'}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
        <button className="btn btn-sm btn-glass" onClick={cleanup}>Limpiar 24h</button>
        <button className="btn btn-sm btn-glass" onClick={async()=>{ const {data,error}=await supabase.rpc('cleanup_inactive_users'); if(error) push(error.message,'err'); else { push(`Usuarios inactivos eliminados: ${data}`,'ok'); loadUsers(); } }}>Purgar inactivos 7d</button>
      </div>

      {tab==='premium' && (
        <Beam size="md" colorVariant="sunset" strength={0.4}><div className="glass" style={{padding:20,marginBottom:16}}>
          <h3 style={{fontWeight:700,marginBottom:12}}>Dar / quitar Premium</h3>
          <div className="field"><label>ID de usuario</label><input className="input" value={targetId} onChange={e=>setTargetId(e.target.value)} placeholder="uuid del usuario" /></div>
          <div className="field"><label>Días</label><input className="input" type="number" value={days} onChange={e=>setDays(e.target.value)} /></div>
          <div style={{display:'flex',gap:10}}><button className="btn btn-primary" onClick={grant}>Activar Premium</button><button className="btn btn-glass" onClick={revoke}>Quitar Premium</button></div>
        </div></Beam>
      )}

      {tab==='aff' && (
        <Beam size="md" colorVariant="ocean" strength={0.35}><div className="glass" style={{padding:20,marginBottom:16}}>
          <h3 style={{fontWeight:700,marginBottom:12}}>Afiliados</h3>
          <div style={{display:'flex',gap:8,marginBottom:14}}>
            <input className="input" value={affName} onChange={e=>setAffName(e.target.value)} placeholder="Nombre del afiliado" />
            <button className="btn btn-primary btn-sm" onClick={createAff}>Crear link</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {affiliates.map(a=>(
              <div key={a.id} className="glass-dark" style={{padding:14,borderRadius:16}}>
                <div style={{fontWeight:600}}>{a.name} <span style={{color:'var(--pearl-muted)',fontSize:'.8rem'}}>({a.code})</span></div>
                <div style={{fontSize:'.8rem',color:'var(--pearl-dim)',marginTop:4}}>Entradas: {a.hits} · Compras: {a.conversions}</div>
                <div style={{fontSize:'.75rem',color:'#FFB199',marginTop:6,wordBreak:'break-all'}}>{location.origin}/?ref={a.code}</div>
              </div>
            ))}
            {affiliates.length===0 && <p style={{color:'var(--pearl-muted)'}}>Sin afiliados aún.</p>}
          </div>
        </div></Beam>
      )}

      {tab==='events' && (
        <Beam size="md" colorVariant="sunset" strength={0.35}><div className="glass" style={{padding:20,marginBottom:16}}>
          <h3 style={{fontWeight:700,marginBottom:12}}>Pregunta del día</h3>
          <div style={{display:'flex',gap:8,marginBottom:20}}>
            <input className="input" value={dailyQ} onChange={e=>setDailyQ(e.target.value)} placeholder="Escribe la pregunta..." />
            <button className="btn btn-primary btn-sm" onClick={setQuestion}>Publicar</button>
          </div>
          <h3 style={{fontWeight:700,marginBottom:12}}>Programar evento</h3>
          <div className="field"><label>Evento</label><select className="input" value={eventSlug} onChange={e=>setEventSlug(e.target.value)}>{EVENTS.map(ev=><option key={ev.slug} value={ev.slug}>{ev.emoji} {ev.title}</option>)}</select></div>
          <div className="field"><label>Título/banner</label><input className="input" value={eventTitle} onChange={e=>setEventTitle(e.target.value)} placeholder="Opcional" /></div>
          <div className="field"><label>Fecha</label><input className="input" type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={scheduleEvent}>Activar evento</button>
        </div></Beam>
      )}

      {tab==='reports' && (
        <div className="glass" style={{padding:20}}><h3 style={{fontWeight:700,marginBottom:12}}>Reportes</h3>
          {reports.length===0 ? <p style={{color:'var(--pearl-muted)'}}>Sin reportes.</p> : reports.map(r=><div key={r.id} className="glass-dark" style={{padding:12,borderRadius:12,marginBottom:8}}><div style={{fontSize:'.82rem'}}><b>{r.reporter_id}</b> → <b>{r.target_id}</b></div><div style={{color:'var(--pearl-dim)',fontSize:'.8rem'}}>{r.reason}</div></div>)}
        </div>
      )}

      {tab==='users' && (
        <>
          <div className="field"><input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nombre o ID..." /></div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {filtered.map(u => (
              <div key={u.id} className="glass" style={{padding:14}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontWeight:600}}>{u.display_name||'Sin nombre'} {u.role==='owner'&&<span className="chip chip-ember">owner</span>}</div>
                    <div style={{fontSize:'.72rem',color:'var(--pearl-muted)',fontFamily:'monospace',wordBreak:'break-all'}}>{u.id}</div>
                    <div style={{fontSize:'.78rem',color:'var(--pearl-dim)',marginTop:4}}>{u.country||'-'} · {u.ciudad||'-'} · activo {timeAgo(u.last_active_at)}</div>
                    <div style={{marginTop:6,display:'flex',gap:6,flexWrap:'wrap'}}>
                      {u.premium_until && new Date(u.premium_until)>new Date() && <span className="chip chip-ember">premium</span>}
                      {u.is_banned && <span className="chip" style={{color:'#ff8a8a'}}>baneado</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6,flexDirection:'column'}}>
                    <button className="btn btn-glass btn-sm" onClick={()=>{setTargetId(u.id); setTab('premium');}}>Premium</button>
                    <button className="btn btn-glass btn-sm" onClick={()=>openInspect(u)}>Ver chats</button>
                    {u.role!=='owner' && (u.is_banned ? <button className="btn btn-glass btn-sm" onClick={()=>unban(u.id)}>Desbanear</button> : <button className="btn btn-glass btn-sm" onClick={()=>ban(u.id)}>Banear</button>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {inspect && (
        <div className="modal-overlay" onClick={()=>setInspect(null)}>
          <motion.div className="modal-sheet glass-strong" onClick={e=>e.stopPropagation()} initial={{y:30,opacity:0}} animate={{y:0,opacity:1}}>
            <h3 className="h2" style={{fontSize:'1.6rem',marginBottom:4}}>Chats de {inspect.display_name}</h3>
            <p style={{color:'var(--pearl-muted)',fontSize:'.8rem',marginBottom:14}}>{inspect.id}</p>
            <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:'50vh',overflow:'auto'}}>
              {inspectChats.length===0 ? <p style={{color:'var(--pearl-muted)'}}>Sin mensajes.</p> : inspectChats.map(m=>(
                <div key={m.id} className="glass-dark" style={{padding:10,borderRadius:12}}>
                  <div style={{fontSize:'.72rem',color:'var(--pearl-muted)'}}>{m.sender_id===inspect.id?'Él/Ella':'Otro'} · {timeAgo(m.created_at)}</div>
                  <div style={{fontSize:'.88rem',marginTop:4}}>{m.body}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-glass" style={{marginTop:14}} onClick={()=>setInspect(null)}>Cerrar</button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
