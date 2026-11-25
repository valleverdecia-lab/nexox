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

export default function Chats() {
  const { user } = useAuth();
  const { push } = useToast();
  const [matches, setMatches] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  const loadMatches = async () => {
    if(!user) return;
    const { data } = await supabase.from('matches').select('*').or(`user_a.eq.${user.id},user_b.eq.${user.id}`).order('created_at',{ascending:false});
    const list = data||[];
    const otherIds = list.map(m => m.user_a===user.id?m.user_b:m.user_a);
    let profiles = [];
    if(otherIds.length){ const { data:p } = await supabase.from('profiles').select('id,display_name,avatar_url,last_active_at').in('id', otherIds); profiles=p||[]; }
    const pmap = Object.fromEntries(profiles.map(p=>[p.id,p]));
    setMatches(list.map(m=>({ ...m, other: pmap[m.user_a===user.id?m.user_b:m.user_a] })));
    setLoading(false);
  };

  const loadMsgs = async (matchId) => {
    const { data } = await supabase.from('messages').select('*').eq('match_id', matchId).order('created_at',{ascending:true}).limit(200);
    setMsgs(data||[]);
    setTimeout(()=>endRef.current?.scrollIntoView({behavior:'smooth'}), 50);
  };

  useEffect(()=>{ loadMatches(); },[user]);
  useEffect(()=>{ if(!active) return; loadMsgs(active.id); const t=setInterval(()=>loadMsgs(active.id), 4000); return ()=>clearInterval(t); },[active?.id]);

  const send = async (e, preset) => {
    e?.preventDefault?.();
    const body = (preset ?? text).trim();
    if(!body||!active) return;
    if(!preset) setText('');
    const { error } = await supabase.from('messages').insert({ match_id: active.id, sender_id: user.id, body });
    if(error) { push('No se pudo enviar','err'); if(!preset) setText(body); }
    else { setMsgs(m=>[...m,{id:Date.now(),match_id:active.id,sender_id:user.id,body,created_at:new Date().toISOString()}]); setTimeout(()=>endRef.current?.scrollIntoView({behavior:'smooth'}),50); }
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

  if(active) return (
    <div className="page" style={{paddingTop:'calc(90px + var(--safe-top))',paddingBottom:'calc(140px + var(--safe-bot))'}}>
      <div className="topbar"><div className="topbar-inner">
        <button className="btn btn-glass btn-sm" onClick={()=>setActive(null)}>Volver</button>
        <div style={{fontWeight:600}}>{active.other?.display_name||'Chat'}</div>
        <div style={{display:'flex',gap:6}}><button className="btn btn-glass btn-sm" onClick={reportActive}>Reportar</button><button className="btn btn-glass btn-sm" onClick={blockActive}>Bloquear</button></div>
      </div></div>
      <div style={{maxWidth:720,margin:'0 auto'}}>
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
            return <div key={m.id} style={{display:'flex',justifyContent:mine?'flex-end':'flex-start'}}>
              <div className={mine?'':'glass'} style={{maxWidth:'78%',padding:'12px 14px',borderRadius:mine?'20px 20px 6px 20px':'20px 20px 20px 6px',background:mine?'linear-gradient(135deg,#D4A017,#E5B829)':'',color:mine?'#111':'var(--pearl)',boxShadow:mine?'0 10px 30px rgba(212,160,23,.25)':'none'}}>
                <div style={{lineHeight:1.6,fontSize:'.94rem',whiteSpace:'pre-wrap'}}>{m.body}</div>
                <div style={{fontSize:'.68rem',opacity:.7,marginTop:6}}>{timeAgo(m.created_at)}</div>
              </div>
            </div>;
          })}
          <div ref={endRef}/>
        </div>
      </div>
      <form onSubmit={send} style={{position:'fixed',left:0,right:0,bottom:'calc(84px + var(--safe-bot))',padding:'0 16px',zIndex:80}}>
        <div className="glass" style={{maxWidth:720,margin:'0 auto',padding:8,display:'flex',gap:8,borderRadius:20}}>
          <input className="input" style={{flex:1,margin:0,background:'transparent',border:'none',boxShadow:'none'}} value={text} onChange={e=>setText(e.target.value)} placeholder="Escribe algo que valga la pena..." />
          <button className="btn btn-primary btn-sm">Enviar</button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="page" style={{paddingTop:'calc(90px + var(--safe-top))'}}>
      <div className="topbar"><div className="topbar-inner"><div className="brand"><span className="brand-mark"><i/></span>Palacalle</div><span className="chip">{matches.length} matches</span></div></div>
      <div className="page-header"><div><div className="eyebrow">Chats</div><h1 className="h2">Conversaciones que <span style={{fontStyle:'italic',color:'#F2C94C'}}>encienden</span></h1></div></div>
      {loading ? <div className="glass skeleton" style={{height:120}}/> : matches.length===0 ? (
        <Beam size="md" colorVariant="mono" strength={0.4}><div className="glass empty"><div className="empty-icon"></div><p>Aún no tienes matches. Cuando dos likes se cruzan, aquí empieza el fuego.</p></div></Beam>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {matches.map(m => (
            <button key={m.id} className="glass floating" style={{padding:16,display:'flex',alignItems:'center',gap:14,textAlign:'left'}} onClick={()=>setActive(m)}>
              <div style={{width:52,height:52,borderRadius:'50%',background:m.other?.avatar_url?`url(${m.other.avatar_url}) center/cover`:'linear-gradient(135deg,#2A2A2A,#141414)',display:'grid',placeItems:'center',fontWeight:700,flexShrink:0,border:'1px solid rgba(212,160,23,.18)'}}>{!m.other?.avatar_url && initials(m.other?.display_name)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600}}>{m.other?.display_name||'Usuario'}</div>
                <div style={{fontSize:'.8rem',color:'var(--pearl-muted)'}}>Match {timeAgo(m.created_at)}</div>
              </div>
              <span style={{color:'var(--laca-soft)'}}>→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
