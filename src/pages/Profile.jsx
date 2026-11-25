import { useEffect, useState } from 'react';
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
  useEffect(()=>{ if(profile) setForm({
    display_name:profile.display_name||'', bio:profile.bio||'', country:profile.country||'', ciudad:profile.ciudad||'',
    gender:profile.gender||'', seeking:profile.seeking||'', birth_year:profile.birth_year||'', ig_handle:profile.ig_handle||''
  }); },[profile]);
  useEffect(()=>{ (async()=>{ const { data } = await supabase.rpc('get_received_whispers'); setWhispers(data||[]); })(); },[user]);

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

  const premiumMsg = `Hola, quiero activar Palacalle Premium. Mi ID de usuario es: ${user?.id}. Mi nombre en la app es: ${profile?.display_name||''}.`;
  const premiumLink = waLink(premiumMsg);

  return (
    <div className="page page-narrow" style={{paddingTop:'calc(90px + var(--safe-top))'}}>
      <div className="topbar"><div className="topbar-inner"><div className="brand"><span className="brand-mark"><i/></span>Palacalle</div>
        <div style={{display:'flex',gap:8}}>
          {isOwner && <button className="btn btn-glass btn-sm" onClick={toggleViewAs}>{viewAs==='owner'?'Vista: Admin':'Vista: Usuario'}</button>}
          <button className="btn btn-glass btn-sm" onClick={signOut}>Salir</button>
        </div>
      </div></div>

      <div className="page-header"><div><div className="eyebrow">Tu perfil</div><h1 className="h2">Tu carta en <span style={{fontStyle:'italic',color:'#FFDCCF'}}>la calle</span></h1></div></div>

      <Beam size="md" colorVariant="sunset" strength={0.45}>
        <div className="glass-strong" style={{padding:22,marginBottom:16,display:'flex',gap:16,alignItems:'center'}}>
          <div style={{width:72,height:72,borderRadius:24,background:profile?.avatar_url?`url(${profile.avatar_url}) center/cover`:'linear-gradient(135deg,#123A6B,#0A2342)',display:'grid',placeItems:'center',fontFamily:'var(--serif)',fontSize:'1.8rem',border:'1px solid rgba(245,241,232,.18)'}}>{!profile?.avatar_url && initials(profile?.display_name)}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:'1.2rem'}}>{profile?.display_name||'Tu nombre'}</div>
            <div style={{color:'var(--pearl-muted)',fontSize:'.82rem',marginTop:4}}>ID: <span style={{fontFamily:'monospace',fontSize:'.78rem'}}>{user?.id}</span></div>
            <div style={{marginTop:8}}>{profile?.premium_until && new Date(profile.premium_until)>new Date() ? <span className="chip chip-ember">Premium activo</span> : <span className="chip">Plan gratis</span>}</div>
          </div>
        </div>
      </Beam>

      <Beam size="md" colorVariant="ocean" strength={0.35}>
        <form className="glass" style={{padding:22,marginBottom:16}} onSubmit={save}>
          <h3 style={{fontWeight:700,marginBottom:14}}>Editar perfil</h3>
          <div className="field"><label>Nombre</label><input className="input" value={form.display_name||''} onChange={e=>setForm({...form,display_name:e.target.value})} /></div>
          <div className="field"><label>Bio</label><textarea className="input" value={form.bio||''} onChange={e=>setForm({...form,bio:e.target.value})} /></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="field"><label>País</label><input className="input" value={form.country||''} onChange={e=>setForm({...form,country:e.target.value})} /></div>
            <div className="field"><label>Ciudad</label><input className="input" value={form.ciudad||''} onChange={e=>setForm({...form,ciudad:e.target.value})} /></div>
            <div className="field"><label>Año nac.</label><input className="input" type="number" value={form.birth_year||''} onChange={e=>setForm({...form,birth_year:e.target.value})} /></div>
            <div className="field"><label>Género</label><select className="input" value={form.gender||''} onChange={e=>setForm({...form,gender:e.target.value})}><option value="">-</option><option value="mujer">Mujer</option><option value="hombre">Hombre</option><option value="otro">Otro</option></select></div>
          </div>
          <div className="field"><label>Busco</label><select className="input" value={form.seeking||''} onChange={e=>setForm({...form,seeking:e.target.value})}><option value="">-</option><option value="mujeres">Mujeres</option><option value="hombres">Hombres</option><option value="todos">Todos</option></select></div>
          <div style={{display:'flex',gap:10}}><button className="btn btn-primary" disabled={saving}>{saving?'Guardando...':'Guardar cambios'}</button><button type="button" className="btn btn-glass" onClick={saveLocation}>Guardar mi ubicación</button></div>
        </form>
      </Beam>

      <Beam size="md" colorVariant="sunset" strength={0.6}>
        <div className="glass-strong" style={{padding:24,marginBottom:16}}>
          <div className="eyebrow">Palacalle Premium</div>
          <h3 className="h2" style={{fontSize:'1.8rem',marginBottom:8}}>Más alcance, <span style={{fontStyle:'italic',color:'#FFDCCF'}}>más fuego</span></h3>
          <p className="sub" style={{marginBottom:16}}>Desbloquea lo mejor de la calle.</p>
          <div style={{display:'grid',gap:10,marginBottom:18}}>
            {[['🔥','Modo Calentón prioritario','Aparece primero a la gente cerca.'],['🤫','5 susurros al día','En vez de 1, susurra 5 veces cada 24h.'],['👀','Quién te vio','Mira quién anda rondando tu perfil.'],['⚡','Boost diario','Un empujón para estar arriba en Descubrir.']].map(([ic,t,d])=>(
              <div key={t} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'10px 0',borderBottom:'1px solid rgba(245,241,232,.08)'}}>
                <span style={{fontSize:'1.2rem'}}>{ic}</span><div><div style={{fontWeight:600,fontSize:'.92rem'}}>{t}</div><div style={{color:'var(--pearl-muted)',fontSize:'.82rem'}}>{d}</div></div>
              </div>
            ))}
          </div>
          <div className="glass" style={{padding:14,marginBottom:14}}>
            <div style={{fontSize:'.72rem',color:'var(--pearl-muted)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:6}}>Planes (CUP)</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {[['1 semana','1,500 CUP'],['1 mes','4,500 CUP'],['3 meses','11,000 CUP']].map(([l,p])=>(
                <div key={l} className="chip" style={{padding:'10px 14px',fontSize:'.78rem'}}><strong style={{color:'var(--pearl)',marginRight:6}}>{l}</strong> <span style={{color:'#FFB199'}}>{p}</span></div>
              ))}
            </div>
          </div>
          <a className="btn btn-primary" href={premiumLink} target="_blank" rel="noopener noreferrer" style={{width:'100%'}}>
            Activar por WhatsApp · {WHATSAPP_DISPLAY}
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
                    <span style={{fontWeight:600,fontSize:'.88rem'}}>🤫 {w.from_name||'Alguien'}</span>
                    <span style={{fontSize:'.75rem',color:'var(--pearl-muted)'}}>{w.distance_km!=null?`${Number(w.distance_km).toFixed(1)} km`:'Cerca'}</span>
                  </div>
                  <div style={{color:'var(--pearl-dim)',lineHeight:1.6}}>{w.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Beam>

    </div>
  );
}
