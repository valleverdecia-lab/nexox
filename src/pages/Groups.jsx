import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { timeAgo, initials, waLink } from '../lib/helpers';
import { WHATSAPP_DISPLAY } from '../lib/config';
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
 const [photoFile, setPhotoFile] = useState(null);

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
  const cutoff = new Date(Date.now()-12*60*60*1000).toISOString();
  // hide expired photo posts from view
  const { data } = await supabase.from('group_posts').select('*, profiles:author_id(display_name,avatar_url)').eq('group_id', g.id).order('created_at',{ascending:false}).limit(50);
  const filtered = (data||[]).filter(p => !(p.media_url && p.created_at < cutoff));
  setPosts(filtered);
 };

 const canCreate = !!profile?.can_create_group;
 const createGroupWA = waLink(`Hola, quiero crear un grupo OF en Palacalle. Mi ID es: ${user?.id}. Mi nombre es: ${profile?.display_name||''}. Entiendo que cuesta 1000 CUP.`);

 const create = async (e) => {
  e.preventDefault();
  if(!canCreate) return push('La creación de grupos se habilita por el owner después del pago.','err');
  if(mine) return push('Ya tienes un grupo.','err');
  if(!name.trim()) return;
  const { error } = await supabase.from('groups').insert({ owner_id:user.id, name:name.trim(), description:desc.trim() });
  if(error) push(error.message,'err'); else { push('Grupo creado','ok'); setName(''); setDesc(''); load(); }
 };

 const join = async (g) => {
  const { error } = await supabase.from('group_members').insert({ group_id:g.id, user_id:user.id });
  if(error && !String(error.message).includes('duplicate')) push(error.message,'err'); else { loadPosts(g); }
 };

 const post = async (e) => {
  e.preventDefault(); if(!active) return;
  await supabase.from('group_members').upsert({group_id:active.id,user_id:user.id});
  let media_url = '';
  const isOwner = active.owner_id === user.id;
  if(photoFile){
   if(!isOwner) { push('Solo la dueña del grupo puede publicar foto.','err'); return; }
   // enforce 1 photo per day
   const since = new Date(Date.now()-24*60*60*1000).toISOString();
   const { data: recent } = await supabase.from('group_posts').select('id').eq('group_id',active.id).eq('author_id',user.id).neq('media_url','').gte('created_at', since).limit(1);
   if(recent && recent.length){ push('Solo puedes publicar 1 foto cada 24 horas.','err'); return; }
   const ext = (photoFile.name.split('.').pop()||'jpg').toLowerCase();
   const path = `${user.id}/group_${active.id}_${Date.now()}.${ext}`;
   const { error: upErr } = await supabase.storage.from('media').upload(path, photoFile, { upsert:false, contentType: photoFile.type });
   if(upErr){ push(upErr.message,'err'); return; }
   const { data:pub } = supabase.storage.from('media').getPublicUrl(path);
   media_url = pub?.publicUrl||'';
  }
  if(!body.trim() && !media_url) return;
  const { error } = await supabase.from('group_posts').insert({ group_id:active.id, author_id:user.id, body:body.trim().slice(0,600), media_url });
  if(error) push(error.message,'err'); else { setBody(''); setPhotoFile(null); loadPosts(active); }
 };

 if(active) return (
  <div className="page" style={{paddingTop:'calc(90px + var(--safe-top))'}}>
   <div className="topbar"><div className="topbar-inner"><button className="btn btn-glass btn-sm" onClick={()=>setActive(null)}>Volver</button><div style={{fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{active.name}</div><div style={{width:70}}/></div></div>
   <div className="glass-strong" style={{padding:20,marginBottom:16}}>
    <div className="eyebrow">Modo OF · Grupo</div>
    <h2 className="h2" style={{fontSize:'1.8rem',marginBottom:6}}>{active.name}</h2>
    <p style={{color:'var(--pearl-dim)'}}>{active.description||'Sin descripción'}</p>
    <div style={{marginTop:10,fontSize:'.82rem',color:'var(--pearl-muted)'}}>Por {active.profiles?.display_name||'alguien'}</div>
   </div>
   <form className="glass" style={{padding:14,marginBottom:16}} onSubmit={post}>
    <textarea className="input" style={{minHeight:80}} value={body} onChange={e=>setBody(e.target.value)} placeholder="Publica en el muro del grupo..." />
    {active.owner_id===user.id && (
     <div style={{marginTop:10}}>
      <label style={{fontSize:'.75rem',color:'var(--pearl-muted)',display:'block',marginBottom:6}}>Foto del día (solo dueña, 1 cada 24h, se elimina en 12h)</label>
      <input className="input" type="file" accept="image/*" onChange={e=>setPhotoFile(e.target.files?.[0]||null)} />
     </div>
    )}
    <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}><button className="btn btn-primary btn-sm">Publicar</button></div>
   </form>
   <div style={{display:'flex',flexDirection:'column',gap:10}}>
    {posts.map(p=>(<div key={p.id} className="glass" style={{padding:14}}>
     <div style={{fontWeight:600,fontSize:'.88rem',marginBottom:6}}>{p.profiles?.display_name||'Miembro'} <span style={{color:'var(--pearl-muted)',fontWeight:400}}>· {timeAgo(p.created_at)}</span></div>
     {p.body && <div style={{color:'var(--pearl-dim)',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{p.body}</div>}
     {p.media_url && <img src={p.media_url} alt="" style={{marginTop:10,borderRadius:14,maxHeight:360,width:'100%',objectFit:'cover'}} loading="lazy" />}
    </div>))}
    {posts.length===0 && <div className="glass empty"><p>Aún no hay publicaciones en este grupo.</p></div>}
   </div>
  </div>
 );

 return (
  <div className="page" style={{paddingTop:'calc(90px + var(--safe-top))'}}>
   <div className="topbar"><div className="topbar-inner"><div className="brand"><span className="brand-mark"><i/></span>Palacalle</div><span className="chip">Modo OF</span></div></div>
   <div className="page-header"><div><div className="eyebrow">Modo OF</div><h1 className="h2">Grupos de <span style={{fontStyle:'italic',color:'#F2C94C'}}>fans</span></h1><p className="sub" style={{marginTop:8}}>Crea tu grupo, publica en tu muro y reúne a tu gente. Un grupo por usuario.</p></div></div>

   <Beam size="md" colorVariant="mono" strength={0.45}>
    <div className="glass" style={{padding:20,marginBottom:18}}>
     <h3 style={{fontWeight:700,marginBottom:10}}>Crea tu grupo</h3>
     {mine ? <p style={{color:'var(--pearl-dim)'}}>Ya tienes: <b>{mine.name}</b>.</p> : canCreate ? (
      <form onSubmit={create}>
       <div className="field"><label>Nombre del grupo</label><input className="input" value={name} onChange={e=>setName(e.target.value)} required /></div>
       <div className="field"><label>Descripción</label><textarea className="input" value={desc} onChange={e=>setDesc(e.target.value)} /></div>
       <p style={{fontSize:'.75rem',color:'var(--pearl-muted)',marginBottom:10}}>Al crear un grupo tu perfil es visible para los miembros.</p>
       <button className="btn btn-primary">Crear grupo</button>
      </form>
     ) : (
      <div>
       <p style={{color:'var(--pearl-dim)',marginBottom:14,lineHeight:1.7}}>Hacerte un grupo OF cuesta <b style={{color:'#F2C94C'}}>1000 CUP</b>. Escríbenos por WhatsApp y el owner habilita tu creación desde el panel.</p>
       <a className="btn btn-primary" href={createGroupWA} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp · {WHATSAPP_DISPLAY}</a>
      </div>
     )}
    </div>
   </Beam>

   <div style={{display:'flex',flexDirection:'column',gap:10}}>
    {groups.map(g => (
     <button key={g.id} className="glass floating" style={{padding:16,textAlign:'left',display:'flex',gap:12,alignItems:'center'}} onClick={()=>join(g)}>
      <div style={{width:50,height:50,borderRadius:16,background:'linear-gradient(135deg,#2A2A2A,#141414)',display:'grid',placeItems:'center',fontWeight:700,border:'1px solid rgba(212,160,23,.18)'}}>{initials(g.name)}</div>
      <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600}}>{g.name}</div><div style={{fontSize:'.8rem',color:'var(--pearl-muted)'}}>{g.profiles?.display_name||'Owner'} · {timeAgo(g.created_at)}</div></div>
      <span style={{color:'var(--laca-soft)'}}>Entrar</span>
     </button>
    ))}
    {!loading && groups.length===0 && <div className="glass empty"><p>No hay grupos todavía.</p></div>}
   </div>
  </div>
 );
}
