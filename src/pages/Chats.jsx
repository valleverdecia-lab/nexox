import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { timeAgo, initials } from '../lib/helpers';
import Beam from '../components/Beam';

const ICEBREAKERS = [
  '¿Qué extrañas más de Cuba?',
  '¿Malecón o azotea con música?',
  '¿Rumba, trova o reguetón?',
  '¿Qué te trajo a Palacalle?',
  'Si pudiéramos tomarnos algo ahora, ¿qué sería?'
];

function sparkInfo(m){
  const base = new Date(m.created_at).getTime() + 24*3600*1000;
  const extra = m.spark_extended ? 24*3600*1000 : 0;
  const exp = base + extra;
  const left = exp - Date.now();
  return { exp, left, extended: !!m.spark_extended, hot: left > 2*3600*1000, cooling: left > 0 && left <= 2*3600*1000, dead: left <= 0 };
}
function fmtLeft(ms){ if(ms<=0) return 'expiró'; const h=Math.floor(ms/3600000); const m=Math.floor((ms%3600000)/60000); return h>0?`${h}h ${m}m`:`${m}m`; }

export default function Chats() {
  const { user, profile } = useAuth();
  const { push } = useToast();
  const [matches, setMatches] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [sendingAudio, setSendingAudio] = useState(false);
  const [tick, setTick] = useState(0);
  const endRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(()=>{ const t=setInterval(()=>setTick(x=>x+1), 30000); return ()=>clearInterval(t); },[]);

  const loadMatches = async () => {
    if(!user) return;
    const since = new Date(Date.now()-48*3600*1000).toISOString(); // include extended sparks
    const { data } = await supabase.from('matches').select('*').or(`user_a.eq.${user.id},user_b.eq.${user.id}`).gte('created_at', since).order('created_at',{ascending:false});
    const list = (data||[]).filter(m=>sparkInfo(m).left > -3600000); // hide long-dead
    const otherIds = list.map(m => m.user_a===user.id?m.user_b:m.user_a);
    let profiles = [];
    if(otherIds.length){ const { data:p } = await supabase.from('profiles').select('id,display_name,avatar_url,last_active_at').in('id', otherIds); profiles=p||[]; }
    const pmap = Object.fromEntries(profiles.map(p=>[p.id,p]));
    setMatches(list.map(m=>({ ...m, other: pmap[m.user_a===user.id?m.user_b:m.user_a] })));
    setLoading(false);
  };

  const loadMsgs = async (matchId) => {
    const since = new Date(Date.now()-24*3600*1000).toISOString();
    const { data } = await supabase.from('messages').select('*').eq('match_id', matchId).gt('created_at', since).order('created_at',{ascending:true}).limit(200);
    setMsgs(data||[]);
    setTimeout(()=>endRef.current?.scrollIntoView({behavior:'smooth'}), 50);
  };

  useEffect(()=>{ loadMatches(); },[user,tick]);
  useEffect(()=>{ if(!active) return; loadMsgs(active.id); const t=setInterval(()=>loadMsgs(active.id), 4000); return ()=>clearInterval(t); },[active?.id]);
  useEffect(()=>()=>{ if(timerRef.current) clearInterval(timerRef.current); if(mediaRef.current?.state==='recording') mediaRef.current.stop(); },[]);

  const send = async (e, preset) => {
    e?.preventDefault?.();
    const body = (preset ?? text).trim();
    if(!body||!active) return;
    if(!preset) setText('');
    const { error } = await supabase.from('messages').insert({ match_id: active.id, sender_id: user.id, body, kind:'text' });
    if(error) { push('No se pudo enviar','err'); if(!preset) setText(body); }
    else { setMsgs(m=>[...m,{id:Date.now(),match_id:active.id,sender_id:user.id,body,kind:'text',created_at:new Date().toISOString()}]); setTimeout(()=>endRef.current?.scrollIntoView({behavior:'smooth'}),50); }
  };

  const startRecording = async () => {
    if(!active) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '');
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (ev)=>{ if(ev.data.size>0) chunksRef.current.push(ev.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t=>t.stop());
        if(timerRef.current) clearInterval(timerRef.current);
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        if(blob.size < 1000) { push('Nota de voz muy corta','err'); return; }
        await sendAudio(blob, mr.mimeType || 'audio/webm');
      };
      mediaRef.current = mr; mr.start();
      setRecSec(0); setRecording(true);
      timerRef.current = setInterval(()=>setRecSec(s=>s+1), 1000);
    } catch { push('No pudimos acceder al micrófono','err'); }
  };
  const stopRecording = () => { if(mediaRef.current?.state==='recording') mediaRef.current.stop(); };
  const cancelRecording = () => {
    try{ if(mediaRef.current?.state==='recording'){ mediaRef.current.onstop=()=>mediaRef.current?.stream?.getTracks?.().forEach(t=>t.stop()); mediaRef.current.stop(); } }catch{}
    if(timerRef.current) clearInterval(timerRef.current); chunksRef.current=[]; setRecording(false); setRecSec(0);
  };
  const sendAudio = async (blob, mime) => {
    if(!active) return;
    setSendingAudio(true);
    try {
      const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : 'webm';
      const path = `${user.id}/chat/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('media').upload(path, blob, { contentType: mime, upsert: false });
      if(upErr) throw upErr;
      const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
      const audio_url = pub?.publicUrl || '';
      const { error } = await supabase.from('messages').insert({ match_id: active.id, sender_id: user.id, body: 'Nota de voz', kind:'audio', audio_url });
      if(error) throw error;
      setMsgs(m=>[...m,{id:Date.now(),match_id:active.id,sender_id:user.id,body:'Nota de voz',kind:'audio',audio_url,created_at:new Date().toISOString()}]);
      setTimeout(()=>endRef.current?.scrollIntoView({behavior:'smooth'}),50);
      push('Nota de voz enviada','ok');
    } catch (err) { push(err.message || 'No se pudo enviar la nota de voz','err'); }
    finally { setSendingAudio(false); }
  };

  const reportActive = async () => {
    if(!active?.other) return;
    const reason = prompt('¿Por qué quieres reportar a esta persona?');
    if(!reason) return;
    const { error } = await supabase.from('reports').insert({ reporter_id:user.id, target_id: active.other.id, reason: reason.slice(0,300) });
    if(error) push(error.message,'err'); else push('Reporte enviado','ok');
  };
  const blockActive = async () => {
    if(!active?.other) return;
    if(!confirm('Bloquear a este usuario?')) return;
    const { error } = await supabase.from('blocks').insert({ blocker_id:user.id, blocked_id: active.other.id });
    if(error) push(error.message,'err'); else { push('Usuario bloqueado','ok'); setActive(null); loadMatches(); }
  };
  const extendSpark = async () => {
    if(!active) return;
    const { error } = await supabase.rpc('extend_spark', { p_match: active.id });
    if(error) push(error.message.includes('premium_required')?'Extender chispa es Premium.':'No se pudo extender','err');
    else { push('Chispa extendida 24h','ok'); loadMatches(); setActive(a=>({...a, spark_extended:true})); }
  };

  if(active) {
    const sp = sparkInfo(active);
    return (
      <div className="page" style={{paddingTop:'calc(90px + var(--safe-top))',paddingBottom:'calc(160px + var(--safe-bot))'}}>
        <div className="topbar"><div className="topbar-inner">
          <button className="btn btn-glass btn-sm" onClick={()=>setActive(null)}>Volver</button>
          <div style={{textAlign:'center'}}>
            <div style={{fontWeight:600}}>{active.other?.display_name||'Chat'}</div>
            <div style={{fontSize:'.68rem',color:sp.cooling?'#F2C94C':sp.dead?'#F07167':'var(--pearl-muted)'}}>{sp.dead?'Chispa apagada':`Chispa: ${fmtLeft(sp.left)}`}{sp.extended?' · extendida':''}</div>
          </div>
          <div style={{display:'flex',gap:6}}><button className="btn btn-glass btn-sm" onClick={reportActive}>Reportar</button><button className="btn btn-glass btn-sm" onClick={blockActive}>Bloquear</button></div>
        </div></div>
        <div style={{maxWidth:720,margin:'0 auto'}}>
          <div className="glass" style={{padding:'10px 14px',marginBottom:12,fontSize:'.8rem',color:'var(--pearl-dim)',display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
            <span>Modo efímero: mensajes y audios desaparecen en 24h.</span>
            {!sp.extended && !sp.dead && <button className="btn btn-glass btn-sm" onClick={extendSpark}>Extender chispa</button>}
          </div>
          {sp.cooling && <div className="glass" style={{padding:'10px 14px',marginBottom:12,borderColor:'rgba(212,160,23,.35)',color:'#F2C94C',fontSize:'.84rem'}}>La chispa se está enfriando. Manda un mensaje o una nota de voz antes de que se apague.</div>}
          <div style={{display:'flex',flexDirection:'column',gap:10,minHeight:'50vh'}}>
            {msgs.length===0 && (
              <div className="glass" style={{padding:14,marginBottom:8}}>
                <div className="eyebrow" style={{marginBottom:8}}>Rompehielos cubanos</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {ICEBREAKERS.map(q=> <button key={q} className="chip" onClick={()=>send(null,q)} style={{cursor:'pointer',textTransform:'none',letterSpacing:0}}>{q}</button>)}
                </div>
              </div>
            )}
            {msgs.map(m => {
              const mine = m.sender_id===user.id;
              const isAudio = m.kind==='audio' && m.audio_url;
              return <div key={m.id} style={{display:'flex',justifyContent:mine?'flex-end':'flex-start'}}>
                <div className={mine?'':'glass'} style={{maxWidth:'78%',padding:'12px 14px',borderRadius:mine?'20px 20px 6px 20px':'20px 20px 20px 6px',background:mine?'linear-gradient(135deg,#D4A017,#E5B829)':'',color:mine?'#111':'var(--pearl)',boxShadow:mine?'0 10px 30px rgba(212,160,23,.25)':'none'}}>
                  {isAudio ? (
                    <div>
                      <div style={{fontSize:'.78rem',fontWeight:700,marginBottom:6}}>Nota de voz</div>
                      <audio controls preload="none" src={m.audio_url} style={{width:'min(260px,60vw)',height:36}} />
                    </div>
                  ) : <div style={{lineHeight:1.6,fontSize:'.94rem',whiteSpace:'pre-wrap'}}>{m.body}</div>}
                  <div style={{fontSize:'.68rem',opacity:.7,marginTop:6}}>{timeAgo(m.created_at)} · efímero</div>
                </div>
              </div>;
            })}
            <div ref={endRef}/>
          </div>
        </div>
        <div style={{position:'fixed',left:0,right:0,bottom:'calc(84px + var(--safe-bot))',padding:'0 16px',zIndex:80}}>
          <div className="glass" style={{maxWidth:720,margin:'0 auto',padding:8,display:'flex',gap:8,borderRadius:20,alignItems:'center'}}>
            {recording ? (
              <>
                <div style={{flex:1,display:'flex',alignItems:'center',gap:10,padding:'0 8px'}}>
                  <span style={{width:10,height:10,borderRadius:999,background:'#E05353',display:'inline-block',animation:'pulse 1s infinite'}}></span>
                  <span style={{fontWeight:600}}>Grabando {recSec}s</span>
                </div>
                <button type="button" className="btn btn-glass btn-sm" onClick={cancelRecording}>Cancelar</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={stopRecording}>Enviar voz</button>
              </>
            ) : (
              <form onSubmit={send} style={{display:'flex',gap:8,width:'100%',alignItems:'center'}}>
                <button type="button" className="btn btn-glass btn-sm" onClick={startRecording} disabled={sendingAudio || sp.dead} title="Nota de voz" style={{minWidth:44,display:'grid',placeItems:'center'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 11a7 7 0 0 1-14 0"/><path d="M12 18v4M8 22h8"/></svg>
                </button>
                <input className="input" style={{flex:1,margin:0,background:'transparent',border:'none',boxShadow:'none'}} value={text} onChange={e=>setText(e.target.value)} placeholder={sp.dead?'La chispa expiró':(sendingAudio?'Enviando nota de voz...':'Mensaje efímero...')} disabled={sp.dead} />
                <button className="btn btn-primary btn-sm" disabled={sendingAudio || sp.dead}>Enviar</button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{paddingTop:'calc(90px + var(--safe-top))'}}>
      <div className="topbar"><div className="topbar-inner"><div className="brand"><span className="brand-mark"><i/></span>Palacalle</div><span className="chip">{matches.length} matches</span></div></div>
      <div className="page-header"><div><div className="eyebrow">Chats</div><h1 className="h2">Chispas que <span style={{fontStyle:'italic',color:'#F2C94C'}}>encienden</span></h1><p className="sub" style={{marginTop:6}}>Modo efímero: los chats y audios duran 24 horas. Si la vibra es real, muévela rápido.</p></div></div>
      {loading ? <div className="glass skeleton" style={{height:120}}/> : matches.length===0 ? (
        <Beam size="md" colorVariant="mono" strength={0.4}><div className="glass empty"><div className="empty-icon"></div><p>Aún no tienes matches. Cuando dos likes se cruzan, aquí empieza el fuego.</p></div></Beam>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {matches.map(m => {
            const sp = sparkInfo(m);
            return (
              <button key={m.id} className="glass floating" style={{padding:16,display:'flex',alignItems:'center',gap:14,textAlign:'left'}} onClick={()=>setActive(m)}>
                <div style={{width:52,height:52,borderRadius:'50%',background:m.other?.avatar_url?`url(${m.other.avatar_url}) center/cover`:'linear-gradient(135deg,#2A2A2A,#141414)',display:'grid',placeItems:'center',fontWeight:700,flexShrink:0,border:'1px solid rgba(212,160,23,.18)'}}>{!m.other?.avatar_url && initials(m.other?.display_name)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600}}>{m.other?.display_name||'Usuario'}</div>
                  <div style={{fontSize:'.8rem',color:sp.cooling?'#F2C94C':sp.dead?'#F07167':'var(--pearl-muted)'}}>{sp.dead?'Chispa apagada':`Chispa ${fmtLeft(sp.left)}`} · match {timeAgo(m.created_at)}</div>
                </div>
                <span style={{color:'var(--laca-soft)'}}>→</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
