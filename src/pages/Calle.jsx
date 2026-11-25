import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { timeAgo, isBoardOpen, boardWindowLabel, initials, distanceLabel } from '../lib/helpers';
import { EVENTS } from '../lib/config';
import Beam from '../components/Beam';

export default function Calle() {
 const { user, profile } = useAuth();
 const { push } = useToast();
 const [open, setOpen] = useState(isBoardOpen());
 const [posts, setPosts] = useState([]);
 const [body, setBody] = useState('');
 const [event, setEvent] = useState('todos');
 const [dailyQ, setDailyQ] = useState(null);
 const [answer, setAnswer] = useState('');
 const [replyTo, setReplyTo] = useState(null);
 const [replyBody, setReplyBody] = useState('');
 const [activeEvent, setActiveEvent] = useState(null);
 const [whisperTo, setWhisperTo] = useState(null); // {id,name}
 const [whisperBody, setWhisperBody] = useState('');
  const [dailyAnswers, setDailyAnswers] = useState([]);

 useEffect(()=>{ const t=setInterval(()=>setOpen(isBoardOpen()), 30000); return ()=>clearInterval(t); },[]);

 const load = async () => {
  let q = supabase.from('posts').select('id,author_id,body,event_slug,created_at,profiles:author_id(display_name,avatar_url,ciudad,country,lat,lng)').order('created_at',{ascending:false}).limit(60);
  if(event!=='todos') q = q.eq('event_slug', event);
  const { data } = await q;
  setPosts(data||[]);
  const today = new Date().toISOString().slice(0,10);
  const { data: dq } = await supabase.from('daily_questions').select('*').eq('active_date', today).order('created_at',{ascending:false}).limit(1).maybeSingle();
  setDailyQ(dq);
  const { data: ev } = await supabase.from('event_schedule').select('*').eq('is_active',true).order('created_at',{ascending:false}).limit(1).maybeSingle();
  setActiveEvent(ev);
 };
 useEffect(()=>{ load(); },[event]);

 const publish = async (e) => {
  e.preventDefault(); if(!body.trim()) return;
  if(!open) return push(`La Calle abre de ${boardWindowLabel}. Vuelve en la noche.`,'err');
  const autoTag = event!=='todos' ? event : (activeEvent?.event_slug || null);
    const { error } = await supabase.from('posts').insert({ author_id:user.id, body:body.trim().slice(0,500), event_slug: autoTag });
  if(error) push(error.message,'err'); else { setBody(''); push('Publicado en La Calle','ok'); load(); }
 };

 const reply = async (postId) => {
  if(!replyBody.trim()) return;
  const { error } = await supabase.from('comments').insert({ post_id:postId, author_id:user.id, body:replyBody.trim().slice(0,400) });
  if(error) push(error.message,'err'); else { setReplyBody(''); setReplyTo(null); push('Respuesta enviada','ok'); }
 };

 const sendWhisper = async () => {
  if(!whisperTo || !whisperBody.trim()) return;
  const { error } = await supabase.rpc('send_whisper', { p_to: whisperTo.id, p_body: whisperBody.trim(), p_post_id: whisperTo.postId||null });
  if(error) {
   if(String(error.message).includes('whisper_limit')) push('Ya usaste tus susurros de hoy. Premium te da 5.','err');
   else push(error.message,'err');
  } else { push('Susurro enviado en secreto','ok'); setWhisperTo(null); setWhisperBody(''); }
 };

 const submitAnswer = async () => {
  if(!answer.trim()||!dailyQ) return;
  const { error } = await supabase.from('daily_answers').upsert({ question_id:dailyQ.id, user_id:user.id, body:answer.trim().slice(0,300) }, {onConflict:'question_id,user_id'});
  if(error) push(error.message,'err'); else { push('Respuesta guardada','ok'); setAnswer(''); }
 };

 return (
  <div className="page" style={{paddingTop:'calc(90px + var(--safe-top))'}}>
   <div className="topbar"><div className="topbar-inner"><div className="brand"><span className="brand-mark"><i/></span>Palacalle</div><span className={`chip ${open?'chip-live':''}`}>{open?'Abierta ahora':'Cerrada · 20:00–05:00'}</span></div></div>

   <div className="page-header">
    <div>
     <div className="eyebrow">La Calle</div>
     <h1 className="h2">La noche se <span style={{fontStyle:'italic',color:'#F2C94C'}}>habla</span></h1>
     <p className="sub" style={{marginTop:8}}>Publica, responde, susurra. La Calle abre de {boardWindowLabel}. Lo que pasa en la calle, se renueva cada 24h.</p>
    </div>
   </div>

   {activeEvent && (
    <Beam size="sm" colorVariant="sunset" strength={0.6}>
     <div className="glass-strong" style={{padding:16,marginBottom:16,display:'flex',gap:12,alignItems:'center'}}>
      <span style={{width:10,height:10,borderRadius:999,background:"var(--laca)",boxShadow:"0 0 0 6px rgba(212,160,23,.18)",flexShrink:0}}></span>
      <div><div style={{fontWeight:700}}>Evento activo: {activeEvent.title}</div><div style={{color:'var(--pearl-dim)',fontSize:'.85rem'}}>{activeEvent.banner_text||'Entra y deja tu huella esta noche.'}</div></div>
     </div>
    </Beam>
   )}

   {dailyQ && (
    
     <div className="glass" style={{padding:18,marginBottom:16}}>
      <div className="eyebrow">Pregunta del día</div>
      <div style={{fontWeight:600,marginBottom:12,lineHeight:1.5}}>{dailyQ.question}</div>
      <div style={{display:'flex',gap:8}}>
       <input className="input" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Tu respuesta..." />
       <button className="btn btn-primary btn-sm" onClick={submitAnswer}>Responder</button>
      </div>
     </div>
    
   )}

   <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:8,marginBottom:14}}>
    <button className={`chip ${event==='todos'?'chip-laca':''}`} onClick={()=>setEvent('todos')}>Todos</button>
    {EVENTS.map(ev => <button key={ev.slug} className={`chip ${event===ev.slug?'chip-laca':''}`} onClick={()=>setEvent(ev.slug)}>{ev.title}</button>)}
   </div>

   
    <form className="glass" style={{padding:16,marginBottom:18}} onSubmit={publish}>
     <textarea className="input" style={{minHeight:90}} value={body} onChange={e=>setBody(e.target.value)} placeholder={open?"¿Qué se dice en la calle hoy?":"La Calle abre a las 20:00..."} disabled={!open} />
     <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10}}>
      <span style={{fontSize:'.75rem',color:'var(--pearl-muted)'}}>{body.length}/500</span>
      <button className="btn btn-primary btn-sm" disabled={!open}>Publicar</button>
     </div>
    </form>
   

   <div style={{display:'flex',flexDirection:'column',gap:12}}>
    {posts.map(p => (
     <motion.div key={p.id} className="glass" style={{padding:16}} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>
      <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:10}}>
       <div style={{width:38,height:38,borderRadius:12,background:'linear-gradient(135deg,#2A2A2A,#141414)',display:'grid',placeItems:'center',fontSize:'.8rem',fontWeight:700}}>{initials(p.profiles?.display_name)}</div>
       <div style={{flex:1}}><div style={{fontWeight:600,fontSize:'.9rem'}}>{p.profiles?.display_name||'Alguien'}</div><div style={{fontSize:'.72rem',color:'var(--pearl-muted)'}}>{timeAgo(p.created_at)} {p.event_slug?`· ${EVENTS.find(e=>e.slug===p.event_slug)?.emoji||''} ${p.event_slug}`:''}</div></div>
       {p.author_id !== user.id && (
        <button className="btn btn-ghost btn-sm" onClick={()=>setWhisperTo({id:p.author_id,name:p.profiles?.display_name,postId:p.id})}> Susurrar</button>
       )}
      </div>
      <p style={{lineHeight:1.7,color:'var(--pearl-dim)',whiteSpace:'pre-wrap'}}>{p.body}</p>
      <div style={{display:'flex',gap:8,marginTop:12}}>
       <button className="btn btn-glass btn-sm" onClick={()=>setReplyTo(replyTo===p.id?null:p.id)}>Responder</button>
      </div>
      {replyTo===p.id && (
       <div style={{display:'flex',gap:8,marginTop:10}}>
        <input className="input" value={replyBody} onChange={e=>setReplyBody(e.target.value)} placeholder="Tu respuesta..." />
        <button className="btn btn-primary btn-sm" onClick={()=>reply(p.id)}>Enviar</button>
       </div>
      )}
     </motion.div>
    ))}
    {posts.length===0 && <div className="glass empty"><p>La Calle está en silencio. Sé el primero en romperlo.</p></div>}
   </div>

   {whisperTo && (
    <div className="modal-overlay" onClick={()=>setWhisperTo(null)}>
     <motion.div className="modal-sheet glass-strong" onClick={e=>e.stopPropagation()} initial={{y:30,opacity:0}} animate={{y:0,opacity:1}}>
      <div className="eyebrow">Susurro anónimo</div>
      <h3 className="h2" style={{fontSize:'1.8rem',marginBottom:8}}>Susurrar a {whisperTo.name}</h3>
      <p className="sub" style={{marginBottom:14}}>Tu identidad no se muestra. Solo verán tu nombre y qué tan cerca estás. 1 susurro/24h (5 con Premium).</p>
      <textarea className="input" value={whisperBody} onChange={e=>setWhisperBody(e.target.value)} placeholder="Di lo que no te atreves en voz alta..." />
      <div style={{display:'flex',gap:10,marginTop:14}}>
       <button className="btn btn-glass" onClick={()=>setWhisperTo(null)}>Cancelar</button>
       <button className="btn btn-primary" style={{flex:1}} onClick={sendWhisper}>Enviar susurro</button>
      </div>
     </motion.div>
    </div>
   )}
  </div>
 );
}
