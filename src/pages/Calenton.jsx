import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { distanceLabel, ageFromYear, initials } from '../lib/helpers';
import Beam from '../components/Beam';

const INTENTS = [
  { v:'', l:'Cualquier vibra' },
  { v:'chat', l:'Charlar' },
  { v:'encuentro', l:'Encuentro' },
  { v:'lo_que_surja', l:'Lo que surja' },
];

export default function Calenton() {
  const { user, profile, refreshProfile } = useAuth();
  const { push } = useToast();
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState([]);
  const [maxKm, setMaxKm] = useState(25);
  const [intent, setIntent] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [myIntent, setMyIntent] = useState(profile?.calenton_intent||'');

  useEffect(()=>{ setMyIntent(profile?.calenton_intent||''); },[profile?.calenton_intent]);

  const loadNearby = async (opts={}) => {
    const km = opts.maxKm ?? maxKm;
    const it = opts.intent ?? intent;
    const on = opts.onlineOnly ?? onlineOnly;
    const { data, error } = await supabase.rpc('nearby_profiles', {
      p_limit: 20,
      p_max_km: km > 0 ? Number(km) : null,
      p_intent: it || null,
      p_online_only: !!on,
    });
    if(error) throw error;
    setPeople(data||[]);
  };

  const activate = async () => {
    setLoading(true);
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy:true, timeout:10000 }));
      const { latitude:lat, longitude:lng } = pos.coords;
      await supabase.from('profiles').update({ lat, lng, location_updated_at: new Date().toISOString(), last_active_at: new Date().toISOString(), is_online: true }).eq('id', user.id);
      await refreshProfile();
      await loadNearby();
      setActive(true);
      push('Radar Calentón activo. Mira quién está cerca.', 'ember');
    } catch (err) {
      push(err.message?.includes('denied') ? 'Necesitamos tu ubicación para encender el Calentón.' : (err.message||'No pudimos activar el modo.'), 'err');
    } finally { setLoading(false); }
  };

  const refresh = async () => { setLoading(true); try { await loadNearby(); push('Radar actualizado','ok'); } catch(e){ push(e.message,'err'); } finally { setLoading(false); } };

  const setAvailable30 = async () => {
    const until = new Date(Date.now()+30*60*1000).toISOString();
    const { error } = await supabase.from('profiles').update({ available_until: until, calenton_intent: myIntent || 'lo_que_surja', last_active_at:new Date().toISOString() }).eq('id', user.id);
    if(error) push(error.message,'err'); else { push('Estás disponible por 30 min. La calle lo nota.','ok'); refreshProfile(); if(active) loadNearby(); }
  };

  const clearAvailable = async () => {
    const { error } = await supabase.from('profiles').update({ available_until: null }).eq('id', user.id);
    if(error) push(error.message,'err'); else { push('Modo disponible desactivado','ok'); refreshProfile(); }
  };

  const like = async (p) => {
    const { error } = await supabase.from('likes').upsert({from_id:user.id, to_id:p.id});
    if(error) return push('No se pudo dar like','err');
    const { data: mutual } = await supabase.from('likes').select('from_id').eq('from_id',p.id).eq('to_id',user.id).maybeSingle();
    if(mutual){ push(`¡Match con ${p.display_name}!`, 'ember'); }
    else push(`Le mandaste calor a ${p.display_name}`, 'ok');
  };

  const availableNow = profile?.available_until && new Date(profile.available_until) > new Date();

  return (
    <div className="page" style={{paddingTop:'calc(90px + var(--safe-top))'}}>
      <div className="topbar"><div className="topbar-inner"><div className="brand"><span className="brand-mark"><i/></span>Palacalle</div><span className="chip chip-live">Radar</span></div></div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Modo Calentón · Radar</div>
          <h1 className="h2">Cerca, <span style={{fontStyle:'italic',color:'#F2C94C'}}>ahora mismo</span></h1>
          <p className="sub" style={{marginTop:8}}>Radar mejorado: filtra por distancia, intención y disponibilidad. Activa 30 min para que te vean con prioridad.</p>
        </div>
      </div>

      {!active ? (
        <Beam size="md" colorVariant="sunset" strength={0.7}>
          <div className="glass-strong" style={{padding:32,textAlign:'center',maxWidth:560,margin:'0 auto'}}>
            <div style={{width:72,height:72,borderRadius:24,margin:'0 auto 14px',display:'grid',placeItems:'center',background:'rgba(212,160,23,.12)',border:'1px solid rgba(212,160,23,.25)',animation:'float 3s ease-in-out infinite'}}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2c2 3 5 5 5 9a5 5 0 1 1-10 0c0-2 1-4 2-5 0 2 1 3 2 3 1-2 1-4 1-7z"/></svg>
            </div>
            <h3 className="h2" style={{fontSize:'2rem',marginBottom:10}}>Enciende el radar</h3>
            <p className="sub" style={{margin:'0 auto 22px'}}>Tu ubicación se usa solo para mostrarte gente cerca. Con filtros premium, encuentras justo la vibra que buscas.</p>
            <button className="btn btn-primary" onClick={activate} disabled={loading} style={{minWidth:220}}>
              {loading ? 'Buscando cerca...' : 'Activar mi radar'}
            </button>
          </div>
        </Beam>
      ) : (
        <div style={{display:'grid',gap:14,maxWidth:760,margin:'0 auto'}}>
          <div className="glass" style={{padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:12}}>
              <span className="chip chip-live">Radar activo</span>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <button className="btn btn-glass btn-sm" onClick={refresh} disabled={loading}>{loading?'Actualizando...':'Actualizar'}</button>
                {availableNow
                  ? <button className="btn btn-glass btn-sm" onClick={clearAvailable}>Apagar 30 min</button>
                  : <button className="btn btn-primary btn-sm" onClick={setAvailable30}>Estoy disponible 30 min</button>}
              </div>
            </div>
            {availableNow && <div style={{marginBottom:12,fontSize:'.82rem',color:'#F2C94C'}}>Visible con prioridad hasta {new Date(profile.available_until).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</div>}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
              <label style={{fontSize:'.8rem',color:'var(--pearl-muted)'}}>Distancia máx: {maxKm} km
                <input type="range" min="1" max="100" value={maxKm} onChange={e=>setMaxKm(Number(e.target.value))} style={{width:'100%'}} />
              </label>
              <label style={{fontSize:'.8rem',color:'var(--pearl-muted)'}}>Intención
                <select className="input" value={intent} onChange={e=>setIntent(e.target.value)}>
                  {INTENTS.map(i=><option key={i.v} value={i.v}>{i.l}</option>)}
                </select>
              </label>
              <label style={{fontSize:'.8rem',color:'var(--pearl-muted)'}}>Mi intención
                <select className="input" value={myIntent} onChange={e=>setMyIntent(e.target.value)}>
                  {INTENTS.filter(i=>i.v).map(i=><option key={i.v} value={i.v}>{i.l}</option>)}
                </select>
              </label>
            </div>
            <label style={{display:'flex',gap:8,alignItems:'center',marginTop:10,fontSize:'.84rem',color:'var(--pearl-dim)'}}>
              <input type="checkbox" checked={onlineOnly} onChange={e=>setOnlineOnly(e.target.checked)} />
              Solo activos/disponibles ahora
            </label>
            <div style={{marginTop:12}}><button className="btn btn-primary btn-sm" onClick={refresh}>Aplicar filtros</button></div>
          </div>

          <div className="glass" style={{padding:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'.85rem',color:'var(--pearl-dim)'}}>{people.length} personas en tu radar</span>
            <span style={{fontSize:'.78rem',color:'var(--pearl-muted)'}}>prioriza disponibles ahora</span>
          </div>

          {people.length===0 && <div className="glass empty"><p>Nadie cerca con esos filtros. Amplía la distancia o cambia la intención.</p></div>}
          {people.map((p,i) => (
            <motion.div key={p.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}>
              <div className="glass" style={{padding:18,display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
                <div style={{width:72,height:72,borderRadius:22,background:p.avatar_url?`url(${p.avatar_url}) center/cover`:'linear-gradient(135deg,#2A2A2A,#141414)',display:'grid',placeItems:'center',fontFamily:'var(--serif)',fontSize:'1.5rem',flexShrink:0,border:'1px solid rgba(245,241,232,.15)'}}>
                  {!p.avatar_url && initials(p.display_name)}
                </div>
                <div style={{flex:'1 1 220px',minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:'1.05rem',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                    {p.display_name}{ageFromYear(p.birth_year)?`, ${ageFromYear(p.birth_year)}`:''}
                    {p.available_until && new Date(p.available_until)>new Date() && <span className="chip chip-live">Disponible ahora</span>}
                    {p.verification_status==='verified' && <span className="chip chip-laca">Verificado</span>}
                  </div>
                  <div style={{color:'var(--pearl-muted)',fontSize:'.84rem',marginTop:4}}>{distanceLabel(p.distance_km)} · {p.ciudad||p.country||'Cerca'} {p.calenton_intent?`· ${INTENTS.find(x=>x.v===p.calenton_intent)?.l||p.calenton_intent}`:''}</div>
                  <div style={{color:'var(--pearl-dim)',fontSize:'.84rem',marginTop:6,lineHeight:1.5}}>{p.bio||'Listo para hablar.'}</div>
                  {p.voice_intro_url && <audio controls src={p.voice_intro_url} style={{marginTop:8,height:34,maxWidth:'100%'}} />}
                </div>
                <button className="btn btn-primary btn-sm" onClick={()=>like(p)}>Me gusta</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
