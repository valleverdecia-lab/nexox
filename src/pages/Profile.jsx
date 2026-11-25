import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { waLink, initials } from '../lib/helpers';
import { WHATSAPP_DISPLAY } from '../lib/config';
import Beam from '../components/Beam';

export default function Profile() {
  const { user, profile, refreshProfile, signOut, isOwner, viewAs, toggleViewAs } = useAuth();
  const { push } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [whispers, setWhispers] = useState([]);
  const [planIdx, setPlanIdx] = useState(1);
  const [likedMe, setLikedMe] = useState([]);
  const [showLiked, setShowLiked] = useState(false);

  useEffect(()=>{ if(profile) setForm({
    display_name:profile.display_name||'', bio:profile.bio||'', country:profile.country||'', ciudad:profile.ciudad||'',
    gender:profile.gender||'', seeking:profile.seeking||'', birth_year:profile.birth_year||'', ig_handle:profile.ig_handle||'',
    passport_city:profile.passport_city||'', incognito: !!profile.incognito
  }); },[profile]);
  useEffect(()=>{ (async()=>{ const { data } = await supabase.rpc('get_received_whispers'); setWhispers(data||[]); })(); },[user]);
  useEffect(()=>{ supabase.rpc('touch_streak').then(()=>refreshProfile()).catch(()=>{}); },[]);

  const PLANS = [
    { id:'1m', label:'1 mes', price:'1,500 CUP', per:'1,500 CUP/mes', save:'Acceso total', note:'Ideal para probar el fuego.' },
    { id:'3m', label:'3 meses', price:'3,900 CUP', per:'1,300 CUP/mes', save:'Ahorras 600 CUP', note:'El punto dulce para conectar en serio.' },
    { id:'6m', label:'6 meses', price:'6,900 CUP', per:'1,150 CUP/mes', save:'Ahorras 2,100 CUP', note:'Para quien viene a quedarse en la calle.' },
  ];
  const selectedPlan = PLANS[planIdx] || PLANS[1];
  const premiumMsg = `Hola, quiero activar Palacalle Premium (${selectedPlan.label} - ${selectedPlan.price}). Mi ID de usuario es: ${user?.id}. Mi nombre en la app es: ${profile?.display_name||''}.`;
  const premiumLink = waLink(premiumMsg);

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, birth_year: form.birth_year?parseInt(form.birth_year):null, last_active_at:new Date().toISOString() };
    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
    setSaving(false);
    if(error) push(error.message,'err'); else { push('Perfil guardado','ok'); refreshProfile(); }
  };

  const saveLocation = async () => {
    try {
      const pos = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:10000}));
      await supabase.from('profiles').update({lat:pos.coords.latitude,lng:pos.coords.longitude,location_updated_at:new Date().toISOString()}).eq('id',user.id);
      push('Ubicación guardada para el Calentón','ok'); refreshProfile();
    } catch { push('No pudimos obtener tu ubicación','err'); }
  };

  const loadLikedMe = async () => {
    const { data, error } = await supabase.rpc('who_liked_me');
    if(error){ push(error.message.includes('premium_required')?'Esta función es Premium.':'No se pudo cargar','err'); return; }
    setLikedMe(data||[]); setShowLiked(true);
  };

  const requestVerification = async () => {
    const { error } = await supabase.from('verification_requests').insert({ user_id:user.id, selfie_url:'pending_selfie', status:'pending' });
    if(error) push(error.message,'err'); else { await supabase.from('profiles').update({verification_status:'pending'}).eq('id',user.id); push('Solicitud de verificación enviada','ok'); refreshProfile(); }
  };

  const checklist = [
    ['Foto de perfil', !!profile?.avatar_url],
    ['Bio', (profile?.bio||'').length>10],
    ['Ciudad', !!profile?.ciudad],
    ['Año de nacimiento', !!profile?.birth_year],
    ['Género y búsqueda', !!profile?.gender && !!profile?.seeking],
    ['Ubicación guardada', !!profile?.lat && !!profile?.lng],
  ];
  const doneCount = checklist.filter(x=>x[1]).length;
  const pct = Math.round(doneCount/checklist.length*100);

  return (
    <div className="page page-narrow" style={{paddingTop:'calc(90px + var(--safe-top))'}}>
      <div className="topbar"><div className="topbar-inner"><div className="brand"><span className="brand-mark"><i/></span>Palacalle</div>
        <div style={{display:'flex',gap:8}}>
          {isOwner && <button className="btn btn-glass btn-sm" onClick={toggleViewAs}>{viewAs==='owner'?'Vista: Admin':'Vista: Usuario'}</button>}
          <button className="btn btn-glass btn-sm" onClick={signOut}>Salir</button>
        </div>
      </div></div>

      <div className="page-header"><div><div className="eyebrow">Tu perfil</div><h1 className="h2">Tu carta en <span style={{fontStyle:'italic',color:'#F2C94C'}}>la calle</span></h1></div></div>

      <Beam size="md" colorVariant="mono" strength={0.45}>
        <div className="glass-strong" style={{padding:22,marginBottom:16,display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{width:72,height:72,borderRadius:24,background:profile?.avatar_url?`url(${profile.avatar_url}) center/cover`:'linear-gradient(135deg,#2A2A2A,#141414)',display:'grid',placeItems:'center',fontFamily:'var(--serif)',fontSize:'1.8rem',border:'1px solid rgba(212,160,23,.22)'}}>{!profile?.avatar_url && initials(profile?.display_name)}</div>
          <div style={{flex:'1 1 180px'}}>
            <div style={{fontWeight:700,fontSize:'1.2rem'}}>{profile?.display_name||'Tu nombre'}</div>
            <div style={{color:'var(--pearl-muted)',fontSize:'.82rem',marginTop:4}}>ID: <span style={{fontFamily:'monospace',fontSize:'.72rem',wordBreak:'break-all'}}>{user?.id}</span></div>
            <div style={{marginTop:8,display:'flex',gap:6,flexWrap:'wrap'}}>
              {profile?.premium_until && new Date(profile.premium_until)>new Date() ? <span className="chip chip-laca">Premium activo</span> : <span className="chip">Plan gratis</span>}
              {profile?.verification_status==='verified' && <span className="chip chip-laca">Verificado</span>}
              {profile?.verification_status==='pending' && <span className="chip">Verificación pendiente</span>}
              <span className="chip">Racha {profile?.streak_count||0} días</span>
            </div>
          </div>
        </div>
      </Beam>

      <div className="glass" style={{padding:18,marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><div className="eyebrow" style={{margin:0}}>Perfil magnético</div><span style={{fontWeight:700,color:'#F2C94C'}}>{pct}%</span></div>
        <div style={{height:8,background:'rgba(255,255,255,.08)',borderRadius:999,overflow:'hidden',marginBottom:12}}><div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,#D4A017,#F2C94C)',transition:'width .6s'}}/></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8}}>
          {checklist.map(([l,ok])=> <div key={l} style={{fontSize:'.78rem',color:ok?'#F2C94C':'var(--pearl-muted)'}}>{ok?'●':'○'} {l}</div>)}
        </div>
      </div>

      <div className="glass" style={{padding:18,marginBottom:16,display:'flex',gap:10,flexWrap:'wrap'}}>
        <button className="btn btn-glass btn-sm" onClick={loadLikedMe}>Quién me dio like</button>
        <button className="btn btn-glass btn-sm" onClick={requestVerification} disabled={profile?.verification_status==='pending'||profile?.verification_status==='verified'}>Pedir verificación</button>
        <button className="btn btn-glass btn-sm" onClick={async()=>{ const v=!profile?.incognito; const {error}=await supabase.from('profiles').update({incognito:v}).eq('id',user.id); if(error) push(error.message,'err'); else {push(v?'Modo incógnito activo':'Incógnito desactivado','ok'); refreshProfile();}}}>{profile?.incognito?'Desactivar incógnito':'Modo incógnito'}</button>
        <button className="btn btn-glass btn-sm" onClick={()=>{ navigator.clipboard?.writeText(window.location.origin+'/?ref='+ (profile?.id?.slice(0,8)||'')); push('Link de invitación copiado','ok'); }}>Invitar amigos</button>
      </div>

      <div className="glass" style={{padding:18,marginBottom:16}}>
        <div className="eyebrow">Misiones nocturnas</div>
        <div style={{display:'grid',gap:8}}>
          {[['Completa tu perfil al 80%', pct>=80],['Entra a La Calle hoy', !!profile?.streak_last_date],['Manda un susurro', !!profile?.last_whisper_at],['Consigue un match', !!profile?.last_match_at]].map(([t,ok])=>(
            <div key={t} style={{display:'flex',justifyContent:'space-between',gap:10,padding:'10px 12px',borderRadius:12,background:ok?'rgba(212,160,23,.10)':'rgba(255,255,255,.03)',border:'1px solid rgba(212,160,23,.14)'}}>
              <span style={{fontSize:'.86rem'}}>{t}</span><span style={{fontSize:'.78rem',color:ok?'#F2C94C':'var(--pearl-muted)'}}>{ok?'Hecho':'Pendiente'}</span>
            </div>
          ))}
        </div>
      </div>

      <Beam size="md" colorVariant="ocean" strength={0.35}>
        <form className="glass" style={{padding:22,marginBottom:16}} onSubmit={save}>
          <h3 style={{fontWeight:700,marginBottom:14}}>Editar perfil</h3>
          <div className="field"><label>Nombre</label><input className="input" value={form.display_name||''} onChange={e=>setForm({...form,display_name:e.target.value})} /></div>
          <div className="field"><label>Bio</label><textarea className="input" value={form.bio||''} onChange={e=>setForm({...form,bio:e.target.value})} /></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="field"><label>País</label><input className="input" value={form.country||''} onChange={e=>setForm({...form,country:e.target.value})} /></div>
            <div className="field"><label>Ciudad</label><input className="input" value={form.ciudad||''} onChange={e=>setForm({...form,ciudad:e.target.value})} /></div>
            <div className="field"><label>Pasaporte Cubano (ciudad/diáspora)</label><input className="input" value={form.passport_city||''} onChange={e=>setForm({...form,passport_city:e.target.value})} placeholder="Ej: Miami, Madrid..." /></div>
            <div className="field"><label>Año nac.</label><input className="input" type="number" value={form.birth_year||''} onChange={e=>setForm({...form,birth_year:e.target.value})} /></div>
            <div className="field"><label>Género</label><select className="input" value={form.gender||''} onChange={e=>setForm({...form,gender:e.target.value})}><option value="">-</option><option value="mujer">Mujer</option><option value="hombre">Hombre</option><option value="otro">Otro</option></select></div>
            <div className="field"><label>Busco</label><select className="input" value={form.seeking||''} onChange={e=>setForm({...form,seeking:e.target.value})}><option value="">-</option><option value="mujeres">Mujeres</option><option value="hombres">Hombres</option><option value="todos">Todos</option></select></div>
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="btn btn-primary" disabled={saving}>{saving?'Guardando...':'Guardar cambios'}</button><button type="button" className="btn btn-glass" onClick={saveLocation}>Guardar mi ubicación</button></div>
        </form>
      </Beam>

      <Beam size="md" colorVariant="mono" strength={0.4}>
      <div className="glass-strong" style={{padding:24,marginBottom:16}}>
       <div className="eyebrow">Palacalle Premium</div>
       <h3 className="h2" style={{fontSize:'1.8rem',marginBottom:8}}>Más alcance, <span style={{fontStyle:'italic',color:'#F2C94C'}}>más fuego</span></h3>
       <p className="sub" style={{marginBottom:16}}>Desbloquea lo mejor de la calle.</p>
       <div style={{display:'grid',gap:10,marginBottom:18}}>
        {[['Modo Calentón prioritario','Aparece primero a la gente cerca.'],['5 susurros al día','En vez de 1, susurra 5 veces cada 24h.'],['Quién te vio / likes','Mira quién te dio like y entra a su perfil.'],['Boost diario','Un empujón para estar arriba en Descubrir.'],['Deshacer swipe','Recupera el último perfil que pasaste.']].map(([t,d])=>(
         <div key={t} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'10px 0',borderBottom:'1px solid rgba(245,241,232,.08)'}}>
          <span style={{width:8,height:8,borderRadius:999,background:'#D4A017',marginTop:7,flexShrink:0}}></span><div><div style={{fontWeight:600,fontSize:'.92rem'}}>{t}</div><div style={{color:'var(--pearl-muted)',fontSize:'.82rem'}}>{d}</div></div>
         </div>
        ))}
       </div>
       <div style={{margin:'8px 0 18px'}}>
        <div style={{fontSize:'.72rem',color:'var(--pearl-muted)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:12}}>Elige tu plan</div>
        <div style={{position:'relative',height:280,display:'flex',alignItems:'center',justifyContent:'center',overflow:'visible'}}>
          {PLANS.map((pl,i)=>{
            const offset = i - planIdx;
            const active = i===planIdx;
            return (
              <motion.div key={pl.id}
                onClick={()=>setPlanIdx(i)}
                drag={active?'x':false}
                dragConstraints={{left:0,right:0}}
                onDragEnd={(e,info)=>{ if(info.offset.x<-60 && planIdx<PLANS.length-1) setPlanIdx(planIdx+1); if(info.offset.x>60 && planIdx>0) setPlanIdx(planIdx-1); }}
                animate={{ x: offset*28, scale: active?1:0.9 - Math.abs(offset)*0.04, opacity: Math.abs(offset)>1?0: active?1:0.45, rotate: offset*-2.5, zIndex: 10-Math.abs(offset) }}
                transition={{type:'spring',stiffness:260,damping:26}}
                style={{position:'absolute',width:'min(320px,86vw)',cursor:active?'grab':'pointer',touchAction:'pan-y'}}
              >
                <div className="glass-strong" style={{padding:'28px 24px',borderRadius:28,borderColor:active?'rgba(212,160,23,.55)':'rgba(212,160,23,.18)',boxShadow:active?'0 30px 80px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.16)':'0 12px 40px rgba(0,0,0,.35)',minHeight:240,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
                  <div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                      <span className={`chip ${active?'chip-laca':''}`}>{pl.label}</span>
                      {i===2 && <span style={{fontSize:'.68rem',fontWeight:700,color:'#111',background:'linear-gradient(135deg,#D4A017,#F2C94C)',padding:'4px 10px',borderRadius:999}}>MEJOR VALOR</span>}
                    </div>
                    <div style={{fontFamily:'var(--serif)',fontSize:'clamp(2rem,8vw,3rem)',lineHeight:1,color:'#F2C94C',marginBottom:6}}>{pl.price}</div>
                    <div style={{color:'var(--pearl-dim)',fontSize:'.9rem',marginBottom:12}}>{pl.per}</div>
                    <div style={{display:'inline-flex',padding:'6px 12px',borderRadius:999,background:'rgba(212,160,23,.12)',border:'1px solid rgba(212,160,23,.22)',color:'#F2C94C',fontSize:'.78rem',fontWeight:600}}>{pl.save}</div>
                  </div>
                  <p style={{color:'var(--pearl-muted)',fontSize:'.85rem',lineHeight:1.6,marginTop:16}}>{pl.note}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
        <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:8,marginBottom:14}}>
          {PLANS.map((_,i)=>(<button key={i} onClick={()=>setPlanIdx(i)} aria-label={`Plan ${i+1}`} style={{width:i===planIdx?28:8,height:8,borderRadius:999,border:'none',background:i===planIdx?'#D4A017':'rgba(245,245,242,.25)',transition:'all .3s'}} />))}
        </div>
       </div>
       <a className="btn btn-primary" href={premiumLink} target="_blank" rel="noopener noreferrer" style={{width:'100%'}}>
        Activar {selectedPlan.label} por WhatsApp · {WHATSAPP_DISPLAY}
       </a>
       <p style={{fontSize:'.72rem',color:'var(--pearl-muted)',marginTop:10,lineHeight:1.6}}>El mensaje ya incluye tu ID para activar tu cuenta rápido. Pagos en CUP.</p>
      </div>
      </Beam>

      <Beam size="md" colorVariant="ocean" strength={0.35}>
        <div className="glass" style={{padding:20,marginBottom:16}}>
          <div className="eyebrow">Susurros recibidos</div>
          <h3 style={{fontWeight:700,marginBottom:12}}>Lo que te dicen al oído</h3>
          {whispers.length===0 ? <p style={{color:'var(--pearl-muted)',fontSize:'.9rem'}}>Nadie te ha susurrado aún. La noche es joven.</p> : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {whispers.map(w => (
                <div key={w.id} className="glass-dark" style={{padding:14,borderRadius:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:6}}>
                    <span style={{fontWeight:600,fontSize:'.88rem'}}>{w.from_name||'Alguien'}</span>
                    <span style={{fontSize:'.75rem',color:'var(--pearl-muted)'}}>{w.distance_km!=null?`${Number(w.distance_km).toFixed(1)} km`:'Cerca'}</span>
                  </div>
                  <div style={{color:'var(--pearl-dim)',lineHeight:1.6}}>{w.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Beam>

      {showLiked && (
        <div className="modal-overlay" onClick={()=>setShowLiked(false)}>
          <motion.div className="modal-sheet glass-strong" onClick={e=>e.stopPropagation()} initial={{y:30,opacity:0}} animate={{y:0,opacity:1}}>
            <h3 className="h2" style={{fontSize:'1.6rem',marginBottom:10}}>Quién te dio like</h3>
            {likedMe.length===0 ? <p style={{color:'var(--pearl-muted)'}}>Aún no hay likes nuevos.</p> : likedMe.map(p=>(
              <div key={p.id} className="glass-dark" style={{padding:12,borderRadius:14,marginBottom:8}}>
                <div style={{fontWeight:600}}>{p.display_name}</div>
                <div style={{fontSize:'.82rem',color:'var(--pearl-dim)'}}>{p.ciudad||p.country||'Cerca'}</div>
              </div>
            ))}
            <button className="btn btn-glass" style={{marginTop:12}} onClick={()=>setShowLiked(false)}>Cerrar</button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
