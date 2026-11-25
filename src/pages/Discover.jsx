import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ageFromYear, distanceLabel, initials } from '../lib/helpers';
import Beam from '../components/Beam';

function Card({ p, onLike, onPass }) {
  const age = ageFromYear(p.birth_year);
  return (
    <motion.div className="glass-strong" style={{padding:0,overflow:'hidden',borderRadius:32,maxWidth:520,margin:'0 auto'}}
      drag="x" dragConstraints={{left:0,right:0}} dragElastic={0.8}
      onDragEnd={(e,info)=>{ if(info.offset.x>120) onLike(p); else if(info.offset.x<-120) onPass(p); }}
      initial={{opacity:0,scale:.96,y:30}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.96}} transition={{duration:.45,ease:[.22,1,.36,1]}}>
      <div style={{height:420,background:`linear-gradient(180deg, rgba(10,35,66,.1), rgba(6,22,43,.6)), ${p.avatar_url?`url(${p.avatar_url}) center/cover`:`linear-gradient(135deg,#123A6B,#0A2342)`}`,display:'flex',alignItems:'flex-end',padding:24,position:'relative'}}>
        {!p.avatar_url && <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',fontSize:'5rem',fontFamily:'var(--serif)',color:'rgba(245,241,232,.18)'}}>{initials(p.display_name)}</div>}
        <div style={{position:'absolute',top:16,left:16,display:'flex',gap:8}}>
          <span className="chip chip-live">En la calle</span>
          {p.country && <span className="chip">{p.country}</span>}
        </div>
        <div style={{position:'relative',zIndex:1}}>
          <h2 style={{fontFamily:'var(--serif)',fontSize:'2.4rem',lineHeight:1,marginBottom:6}}>{p.display_name}{age?`, ${age}`:''}</h2>
          <p style={{color:'var(--pearl-dim)',fontSize:'.9rem'}}>{p.ciudad || p.country || 'Cerca de ti'} {p.distance_km!=null?`· ${distanceLabel(p.distance_km)}`:''}</p>
        </div>
      </div>
      <div style={{padding:20}}>
        <p style={{color:'var(--pearl-dim)',lineHeight:1.7,minHeight:48}}>{p.bio || 'Sin bio todavía. A veces el misterio gana.'}</p>
        <div style={{display:'flex',gap:12,marginTop:18,justifyContent:'center'}}>
          <button className="btn btn-glass btn-icon" onClick={()=>onPass(p)} aria-label="Pasar" style={{width:60,height:60,fontSize:'1.4rem'}}>✕</button>
          <button className="btn btn-primary btn-icon" onClick={()=>onLike(p)} aria-label="Me gusta" style={{width:68,height:68,fontSize:'1.5rem',boxShadow:'0 14px 40px rgba(255,90,43,.45)'}}>♥</button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Discover() {
  const { user, profile, refreshProfile } = useAuth();
  const { push } = useToast();
  const [people, setPeople] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({display_name:'', bio:'', country:'', ciudad:'', gender:'', seeking:'', birth_year:''});

  useEffect(()=>{ if(profile){ setForm({display_name:profile.display_name||'',bio:profile.bio||'',country:profile.country||'',ciudad:profile.ciudad||'',gender:profile.gender||'',seeking:profile.seeking||'',birth_year:profile.birth_year||''}); if(!profile.onboarding_done) setEditing(true); } },[profile]);

  const load = useCallback(async () => {
    if(!user) return; setLoading(true);
    // get people I haven't liked/passed? simple: all profiles except me, recently active
    const { data: liked } = await supabase.from('likes').select('to_id').eq('from_id', user.id);
    const likedIds = new Set((liked||[]).map(x=>x.to_id));
    let q = supabase.from('profiles').select('id,display_name,bio,country,ciudad,gender,birth_year,avatar_url,photos,last_active_at,lat,lng').neq('id', user.id).eq('is_banned', false).order('last_active_at',{ascending:false}).limit(30);
    const { data } = await q;
    const filtered = (data||[]).filter(p=>!likedIds.has(p.id));
    setPeople(filtered); setIdx(0); setLoading(false);
  },[user]);

  useEffect(()=>{ load(); },[load]);

  const act = async (p, like) => {
    if(like){
      const { error } = await supabase.from('likes').upsert({from_id:user.id,to_id:p.id});
      if(error){ push('No se pudo dar like','err'); return; }
      // check mutual
      const { data: mutual } = await supabase.from('likes').select('from_id').eq('from_id',p.id).eq('to_id',user.id).maybeSingle();
      if(mutual){
        await supabase.from('matches').upsert({user_a: user.id< p.id?user.id:p.id, user_b: user.id< p.id?p.id:user.id}, {onConflict:'user_a,user_b'});
        await supabase.from('profiles').update({last_match_at:new Date().toISOString()}).in('id',[user.id,p.id]);
        push(`¡Match con ${p.display_name}! La calle se puso buena.`, 'ember');
      } else {
        push('Like enviado', 'ok');
      }
    }
    setIdx(i=>i+1);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    const payload = { ...form, birth_year: form.birth_year?parseInt(form.birth_year):null, onboarding_done:true, last_active_at:new Date().toISOString() };
    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
    if(error) push(error.message,'err'); else { push('Perfil listo. Ahora sí, a la calle.','ok'); setEditing(false); refreshProfile(); load(); }
  };

  const current = people[idx];

  return (
    <div className="page" style={{paddingTop:'calc(90px + var(--safe-top))'}}>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand"><span className="brand-mark"><i/></span>Palacalle</div>
          <button className="btn btn-glass btn-sm" onClick={()=>setEditing(true)}>Editar perfil</button>
        </div>
      </div>

      <div className="page-header">
        <div>
          <div className="eyebrow">Descubrir</div>
          <h1 className="h2">Personas que <span style={{fontStyle:'italic',color:'#FFDCCF'}}>valen la pena</span></h1>
        </div>
        <span className="chip">{people.length-idx} por ver</span>
      </div>

      {editing && (
        <div className="modal-overlay" onClick={()=>profile?.onboarding_done && setEditing(false)}>
          <motion.form className="modal-sheet glass-strong" onClick={e=>e.stopPropagation()} onSubmit={saveProfile} initial={{y:40,opacity:0}} animate={{y:0,opacity:1}}>
            <h3 className="h2" style={{marginBottom:6}}>Tu perfil</h3>
            <p className="sub" style={{marginBottom:20}}>Lo que pongas aquí es lo que la calle va a ver.</p>
            <div className="field"><label>Nombre</label><input className="input" value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})} required /></div>
            <div className="field"><label>Bio</label><textarea className="input" value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} placeholder="Una línea que te defina..." /></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="field"><label>País</label><input className="input" value={form.country} onChange={e=>setForm({...form,country:e.target.value})} placeholder="Cuba, USA, España..." /></div>
              <div className="field"><label>Ciudad</label><input className="input" value={form.ciudad} onChange={e=>setForm({...form,ciudad:e.target.value})} /></div>
              <div className="field"><label>Año nac.</label><input className="input" type="number" value={form.birth_year} onChange={e=>setForm({...form,birth_year:e.target.value})} placeholder="1998" /></div>
              <div className="field"><label>Género</label><select className="input" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="">Selecciona</option><option value="mujer">Mujer</option><option value="hombre">Hombre</option><option value="otro">Otro</option></select></div>
            </div>
            <div className="field"><label>Busco</label><select className="input" value={form.seeking} onChange={e=>setForm({...form,seeking:e.target.value})}><option value="">Selecciona</option><option value="mujeres">Mujeres</option><option value="hombres">Hombres</option><option value="todos">Todos</option></select></div>
            <div style={{display:'flex',gap:10,marginTop:8}}>
              {profile?.onboarding_done && <button type="button" className="btn btn-glass" onClick={()=>setEditing(false)}>Cancelar</button>}
              <button className="btn btn-primary" style={{flex:1}}>Guardar perfil</button>
            </div>
          </motion.form>
        </div>
      )}

      {loading ? <div className="glass" style={{height:520,maxWidth:520,margin:'0 auto'}}><div className="skeleton" style={{height:'100%'}}/></div>
      : current ? <AnimatePresence mode="wait"><Card key={current.id} p={current} onLike={(p)=>act(p,true)} onPass={(p)=>act(p,false)} /></AnimatePresence>
      : <Beam size="md" colorVariant="sunset" strength={0.4}><div className="glass empty" style={{maxWidth:520,margin:'0 auto'}}><div className="empty-icon">🌴</div><h3 className="h2" style={{fontSize:'1.8rem',marginBottom:8}}>La calle está tranquila</h3><p>No hay más perfiles por ahora. Vuelve en un rato o invita a alguien a Palacalle.</p><button className="btn btn-primary" style={{marginTop:18}} onClick={load}>Recargar</button></div></Beam>}
    </div>
  );
}
