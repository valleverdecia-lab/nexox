import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { timeAgo, isBoardOpen, boardWindowLabel, initials } from '../lib/helpers';
import { EVENTS } from '../lib/config';
import Beam from '../components/Beam';

function affinityLabel(n){ if(n>=4) return 'Afinidad alta'; if(n>=2) return 'Buena vibra'; if(n>=1) return 'Algo en común'; return 'Nueva mirada'; }

export default function Calle() {
  const { user } = useAuth();
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
  const [eventCount, setEventCount] = useState(0);
  const [whisperTo, setWhisperTo] = useState(null);
  const [whisperBody, setWhisperBody] = useState('');
  const [dailyMatches, setDailyMatches] = useState([]);
  const [myDailyAnswer, setMyDailyAnswer] = useState('');

  useEffect(()=>{ const t=setInterval(()=>setOpen(isBoardOpen()), 30000); return ()=>clearInterval(t); },[]);

  const loadDaily = async () => {
    const { data, error } = await supabase.rpc('daily_question_matches');
    if(error) return;
    setDailyQ(data?.question || null);
    setMyDailyAnswer(data?.my_answer || '');
    setDailyMatches(data?.answers || []);
  };

  const load = async () => {
    let q = supabase.from('posts').select('id,author_id,body,event_slug,created_at,boost_until,profiles:author_id(display_name,avatar_url,ciudad,country,lat,lng)').order('created_at',{ascending:false}).limit(60);
    if(event!=='todos') q = q.eq('event_slug', event);
    const { data } = await q;
    setPosts(data||[]);
    const nowIso = new Date().toISOString();
    const { data: ev } = await supabase.from('event_schedule').select('*').eq('is_active',true).lte('starts_at', nowIso).order('created_at',{ascending:false}).limit(5);
    const active = (ev||[]).find(e=>!e.ends_at || e.ends_at>=nowIso) || (ev||[])[0] || null;
    setActiveEvent(active);
    if(active){ const { count } = await supabase.from('posts').select('*',{count:'exact',head:true}).eq('event_slug', active.event_slug); setEventCount(count||0); }
    else setEventCount(0);
    await loadDaily();
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
    if(error) push(error.message,'err'); else { push('Respuesta guardada. Buscando afinidades...','ok'); setAnswer(''); loadDaily(); }
  };

  const likeFromDaily = async (p) => {
    const { error } = await supabase.from('likes').upsert({ from_id:user.id, to_id:p.user_id });
    if(error) return push(error.message,'err');
    const { data: mutual } = await supabase.from('likes').select('from_id').eq('from_id',p.user_id).eq('to_id',user.id).maybeSingle();
    if(mutual) push(`Match con ${p.display_name}. La pregunta los unió.`,'laca');
    else push(`Like enviado a ${p.display_name}`,'ok');
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
          <div className="glass-strong" style={{padding:16,marginBottom:16,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
            <span style={{width:10,height:10,borderRadius:999,background:"var(--laca)",boxShadow:"0 0 0 6px rgba(212,160,23,.18)",flexShrink:0}}></span>
            <div style={{flex:1}}><div style={{fontWeight:700}}>Evento activo: {activeEvent.title}</div><div style={{color:'var(--pearl-dim)',fontSize:'.85rem'}}>{activeEvent.banner_text||'Entra y deja tu huella esta noche.'}</div></div>
            <span className="chip chip-laca">{eventCount} dentro</span>
          </div>
        </Beam>
      )}

      {dailyQ && (
        <div className="glass" style={{padding:18,marginBottom:16}}>
          <div className="eyebrow">Pregunta del día</div>
          <div style={{fontWeight:600,marginBottom:12,lineHeight:1.5}}>{dailyQ.question}</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <input className="input" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder={myDailyAnswer?"Actualiza tu respuesta...":"Tu respuesta..."} />
            <button className="btn btn-primary btn-sm" onClick={submitAnswer}>{myDailyAnswer?'Actualizar':'Responder'}</button>
          </div>
          {myDailyAnswer && <div style={{marginTop:10,fontSize:'.83rem',color:'var(--pearl-muted)'}}>Tu respuesta: <span style={{color:'var(--pearl-dim)'}}>{myDailyAnswer}</span></div>}
        </div>
      )}

      {dailyQ && (
        <div className="glass" style={{padding:18,marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',marginBottom:12,flexWrap:'wrap'}}>
            <div><div className="eyebrow" style={{marginBottom:4}}>Afinidad del día</div><div style={{fontWeight:700}}>Gente que vibró con la misma pregunta</div></div>
            <span className="chip">{dailyMatches.length} respuestas</span>
          </div>
          {dailyMatches.length===0 ? <p style={{color:'var(--pearl-muted)',fontSize:'.88rem'}}>Cuando otros respondan, aquí verás afinidades para conectar rápido.</p> : (
            <div style={{display:'grid',gap:10}}>
              {dailyMatches.slice(0,8).map(p => (
                <div key={p.user_id} className="glass-dark" style={{padding:14,borderRadius:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'flex-start',flexWrap:'wrap'}}>
                    <div style={{display:'flex',gap:10,alignItems:'center'}}>
                      <div style={{width:40,height:40,borderRadius:12,background:p.avatar_url?`url(${p.avatar_url}) center/cover`:'linear-gradient(135deg,#2A2A2A,#141414)',display:'grid',placeItems:'center',fontWeight:700}}>{!p.avatar_url && initials(p.display_name)}</div>
                      <div>
                        <div style={{fontWeight:600}}>{p.display_name} {p.verification_status==='verified' && <span style={{color:'#F2C94C',fontSize:'.75rem'}}>● verificada</span>}</div>
                        <div style={{fontSize:'.75rem',color:'var(--pearl-muted)'}}>{p.ciudad||p.country||'Cerca'} · {affinityLabel(p.affinity||0)}</div>
                      </div>
                    </div>
                    <span className="chip chip-laca">{p.affinity||0} pts afinidad</span>
                  </div>
                  <p style={{marginTop:10,lineHeight:1.6,color:'var(--pearl-dim)',fontSize:'.9rem'}}>{p.body}</p>
                  <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
                    <button className="btn btn-primary btn-sm" onClick={()=>likeFromDaily(p)}>Me gusta</button>
                    <button className="btn btn-glass btn-sm" onClick={()=>setWhisperTo({id:p.user_id,name:p.display_name,postId:null})}>Susurrar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:'.9rem'}}>{p.profiles?.display_name||'Alguien'}</div><div style={{fontSize:'.72rem',color:'var(--pearl-muted)'}}>{timeAgo(p.created_at)} {p.event_slug?`· ${p.event_slug}`:''} {p.boost_until && new Date(p.boost_until)>new Date()?'· Boost':''}</div></div>
              {p.author_id !== user.id && (
                <button className="btn btn-ghost btn-sm" onClick={()=>setWhisperTo({id:p.author_id,name:p.profiles?.display_name,postId:p.id})}>Susurrar</button>
              )}
            </div>
            <p style={{lineHeight:1.7,color:'var(--pearl-dim)',whiteSpace:'pre-wrap'}}>{p.body}</p>
            <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
              <button className="btn btn-glass btn-sm" onClick={()=>setReplyTo(replyTo===p.id?null:p.id)}>Responder</button>
              {p.author_id===user.id ? <button className="btn btn-glass btn-sm" onClick={async()=>{ const {error}=await supabase.rpc('boost_post',{p_post:p.id,p_hours:1}); if(error) push(error.message.includes('premium_required')?'Boost es Premium':'Error','err'); else { push('Post boosteado 1h','ok'); load(); } }}>Boost</button>
              : <button className="btn btn-glass btn-sm" onClick={async()=>{ const reason=prompt('Motivo del reporte'); if(!reason) return; const {error}=await supabase.from('reports').insert({reporter_id:user.id,target_id:p.author_id,reason:reason.slice(0,300)}); if(error) push(error.message,'err'); else push('Reporte enviado','ok'); }}>Reportar</button>}
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
