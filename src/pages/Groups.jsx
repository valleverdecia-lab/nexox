import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { timeAgo, initials, waLink } from '../lib/helpers';
import Beam from '../components/Beam';

export default function Groups() {
  const { user, profile } = useAuth();
  const { push } = useToast();
  const [groups, setGroups] = useState([]);
  const [mine, setMine] = useState(null);
  const [active, setActive] = useState(null);
  const [posts, setPosts] = useState([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('groups').select('*, profiles:owner_id(display_name,avatar_url)').order('created_at',{ascending:false}).limit(40);
    setGroups(data||[]);
    const my = (data||[]).find(g=>g.owner_id===user.id); setMine(my||null);
    setLoading(false);
  };
  useEffect(()=>{ load(); },[user]);

  const loadPosts = async (g) => {
    setActive(g);
    const { data } = await supabase.from('group_posts').select('*, profiles:author_id(display_name,avatar_url)').eq('group_id', g.id).order('created_at',{ascending:false}).limit(50);
    setPosts(data||[]);
  };

  const create = async (e) => {
    e.preventDefault();
    if(mine) return push('Ya tienes un grupo. Para más, escribe por WhatsApp.','err');
    if(!name.trim()) return;
    const { error } = await supabase.from('groups').insert({ owner_id:user.id, name:name.trim(), description:desc.trim() });
    if(error) push(error.message,'err'); else { push('Grupo creado','ok'); setName(''); setDesc(''); load(); }
  };

  const join = async (g) => {
    const { error } = await supabase.from('group_members').insert({ group_id:g.id, user_id:user.id });
    if(error && !String(error.message).includes('duplicate')) push(error.message,'err'); else { push(`Te uniste a ${g.name}`,'ok'); loadPosts(g); }
  };

  const post = async (e) => {
    e.preventDefault(); if(!body.trim()||!active) return;
    // ensure member
    await supabase.from('group_members').upsert({group_id:active.id,user_id:user.id});
    const { error } = await supabase.from('group_posts').insert({ group_id:active.id, author_id:user.id, body:body.trim().slice(0,600) });
    if(error) push(error.message,'err'); else { setBody(''); loadPosts(active); }
  };

  if(active) return (
    <div className="page" style={{paddingTop:'calc(90px + var(--safe-top))'}}>
      <div className="topbar"><div className="topbar-inner"><button className="btn btn-glass btn-sm" onClick={()=>setActive(null)}>← Volver</button><div style={{fontWeight:600}}>{active.name}</div><div style={{width:70}}/></div></div>
      <Beam size="md" colorVariant="ocean" strength={0.4}><div className="glass-strong" style={{padding:20,marginBottom:16}}>
        <div className="eyebrow">Modo OF · Grupo</div>
        <h2 className="h2" style={{fontSize:'1.8rem',marginBottom:6}}>{active.name}</h2>
        <p style={{color:'var(--pearl-dim)'}}>{active.description||'Sin descripción'}</p>
        <div style={{marginTop:10,fontSize:'.82rem',color:'var(--pearl-muted)'}}>Por {active.profiles?.display_name||'alguien'}</div>
      </div></Beam>
      <form className="glass" style={{padding:14,marginBottom:16}} onSubmit={post}>
        <textarea className="input" style={{minHeight:80}} value={body} onChange={e=>setBody(e.target.value)} placeholder="Publica en el muro del grupo..." />
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}><button className="btn btn-primary btn-sm">Publicar</button></div>
      </form>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {posts.map(p=>(<div key={p.id} className="glass" style={{padding:14}}><div style={{fontWeight:600,fontSize:'.88rem',marginBottom:6}}>{p.profiles?.display_name||'Miembro'} <span style={{color:'var(--pearl-muted)',fontWeight:400}}>· {timeAgo(p.created_at)}</span></div><div style={{color:'var(--pearl-dim)',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{p.body}</div></div>))}
        {posts.length===0 && <div className="glass empty"><p>Aún no hay publicaciones en este grupo.</p></div>}
      </div>
    </div>
  );

  return (
    <div className="page" style={{paddingTop:'calc(90px + var(--safe-top))'}}>
      <div className="topbar"><div className="topbar-inner"><div className="brand"><span className="brand-mark"><i/></span>Palacalle</div><span className="chip">Modo OF</span></div></div>
      <div className="page-header"><div><div className="eyebrow">Modo OF</div><h1 className="h2">Grupos de <span style={{fontStyle:'italic',color:'#FFDCCF'}}>fans</span></h1><p className="sub" style={{marginTop:8}}>Crea tu grupo, publica en tu muro y reúne a tu gente. Un grupo por usuario.</p></div></div>

      <Beam size="md" colorVariant="sunset" strength={0.35}><div className="glass" style={{padding:20,marginBottom:18}}>
        <h3 style={{fontWeight:700,marginBottom:10}}>Crea tu grupo</h3>
        {mine ? <p style={{color:'var(--pearl-dim)'}}>Ya tienes: <b>{mine.name}</b>. Para más grupos, <a href={waLink('Hola, quiero crear otro grupo en Palacalle.')} target="_blank" rel="noreferrer" style={{color:'#FFB199'}}>escribe por WhatsApp</a>.</p> : (
          <form onSubmit={create}>
            <div className="field"><label>Nombre del grupo</label><input className="input" value={name} onChange={e=>setName(e.target.value)} required /></div>
            <div className="field"><label>Descripción</label><textarea className="input" value={desc} onChange={e=>setDesc(e.target.value)} /></div>
            <p style={{fontSize:'.75rem',color:'var(--pearl-muted)',marginBottom:10}}>Al crear un grupo tu perfil es visible para los miembros.</p>
            <button className="btn btn-primary">Crear grupo</button>
          </form>
        )}
      </div></Beam>

      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {groups.map(g => (
          <button key={g.id} className="glass floating" style={{padding:16,textAlign:'left',display:'flex',gap:12,alignItems:'center'}} onClick={()=>join(g)}>
            <div style={{width:50,height:50,borderRadius:16,background:'linear-gradient(135deg,#123A6B,#0A2342)',display:'grid',placeItems:'center',fontWeight:700}}>{initials(g.name)}</div>
            <div style={{flex:1}}><div style={{fontWeight:600}}>{g.name}</div><div style={{fontSize:'.8rem',color:'var(--pearl-muted)'}}>{g.profiles?.display_name||'Owner'} · {timeAgo(g.created_at)}</div></div>
            <span style={{color:'var(--ember-soft)'}}>Entrar</span>
          </button>
        ))}
        {!loading && groups.length===0 && <div className="glass empty"><p>No hay grupos todavía. Sé el primero en abrir uno.</p></div>}
      </div>
    </div>
  );
}
