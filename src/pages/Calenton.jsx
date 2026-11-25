import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { distanceLabel, ageFromYear, initials } from '../lib/helpers';
import Beam from '../components/Beam';

export default function Calenton() {
  const { user, refreshProfile } = useAuth();
  const { push } = useToast();
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState([]);

  const activate = async () => {
    setLoading(true);
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy:true, timeout:10000 }));
      const { latitude:lat, longitude:lng } = pos.coords;
      await supabase.from('profiles').update({ lat, lng, location_updated_at: new Date().toISOString(), last_active_at: new Date().toISOString() }).eq('id', user.id);
      await refreshProfile();
      const { data, error } = await supabase.rpc('nearby_profiles', { p_limit: 3 });
      if(error) throw error;
      setPeople(data||[]);
      setActive(true);
      push('Modo Calentón activo. Mira quién está cerca.', 'ember');
    } catch (err) {
      push(err.message?.includes('denied') ? 'Necesitamos tu ubicación para encender el Calentón.' : (err.message||'No pudimos activar el modo.'), 'err');
    } finally { setLoading(false); }
  };

  const like = async (p) => {
    const { error } = await supabase.from('likes').upsert({from_id:user.id, to_id:p.id});
    if(error) return push('No se pudo dar like','err');
    const { data: mutual } = await supabase.from('likes').select('from_id').eq('from_id',p.id).eq('to_id',user.id).maybeSingle();
    if(mutual){
      await supabase.from('matches').upsert({user_a:user.id<p.id?user.id:p.id, user_b:user.id<p.id?p.id:user.id},{onConflict:'user_a,user_b'});
      push(`¡Match con ${p.display_name}!`, 'ember');
    } else push(`Le mandaste calor a ${p.display_name}`, 'ok');
  };

  return (
    <div className="page" style={{paddingTop:'calc(90px + var(--safe-top))'}}>
      <div className="topbar"><div className="topbar-inner"><div className="brand"><span className="brand-mark"><i/></span>Palacalle</div><span className="chip chip-live">Calentón</span></div></div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Modo Calentón</div>
          <h1 className="h2">Cerca, <span style={{fontStyle:'italic',color:'#FFDCCF'}}>ahora mismo</span></h1>
          <p className="sub" style={{marginTop:8}}>Enciende tu ubicación y te mostramos 3 personas cerca de ti para hacer match y escribirles. Sin rodeos.</p>
        </div>
      </div>

      {!active ? (
        <Beam size="md" colorVariant="sunset" strength={0.7}>
          <div className="glass-strong" style={{padding:32,textAlign:'center',maxWidth:560,margin:'0 auto'}}>
            <div style={{fontSize:'3.4rem',marginBottom:12,animation:'float 3s ease-in-out infinite'}}>🌡️</div>
            <h3 className="h2" style={{fontSize:'2rem',marginBottom:10}}>Enciende el calor</h3>
            <p className="sub" style={{margin:'0 auto 22px'}}>Tu ubicación se usa solo para mostrarte gente cerca. Incluso si están offline, verás quién estuvo por aquí.</p>
            <button className="btn btn-primary" onClick={activate} disabled={loading} style={{minWidth:220}}>
              {loading ? 'Buscando cerca...' : 'Activar mi ubicación'}
            </button>
          </div>
        </Beam>
      ) : (
        <div style={{display:'grid',gap:14,maxWidth:720,margin:'0 auto'}}>
          <div className="glass" style={{padding:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span className="chip chip-live">Ubicación activa</span>
            <button className="btn btn-ghost btn-sm" onClick={activate}>Actualizar</button>
          </div>
          {people.length===0 && <div className="glass empty"><p>Nadie cerca ahora mismo. Prueba en un rato — la calle cambia rápido.</p></div>}
          {people.map((p,i) => (
            <motion.div key={p.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.08}}>
              <Beam size="sm" colorVariant="sunset" strength={0.45}>
                <div className="glass" style={{padding:18,display:'flex',gap:16,alignItems:'center'}}>
                  <div style={{width:72,height:72,borderRadius:22,background:p.avatar_url?`url(${p.avatar_url}) center/cover`:'linear-gradient(135deg,#123A6B,#0A2342)',display:'grid',placeItems:'center',fontFamily:'var(--serif)',fontSize:'1.5rem',flexShrink:0,border:'1px solid rgba(245,241,232,.15)'}}>
                    {!p.avatar_url && initials(p.display_name)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:'1.05rem'}}>{p.display_name}{ageFromYear(p.birth_year)?`, ${ageFromYear(p.birth_year)}`:''}</div>
                    <div style={{color:'var(--pearl-muted)',fontSize:'.84rem',marginTop:4}}>{distanceLabel(p.distance_km)} · {p.ciudad||p.country||'Cerca'}</div>
                    <div style={{color:'var(--pearl-dim)',fontSize:'.84rem',marginTop:6,lineHeight:1.5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.bio||'Listo para hablar.'}</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={()=>like(p)}>Me gusta</button>
                </div>
              </Beam>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
