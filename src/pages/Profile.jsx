import { useEffect, useState, useRef } from 'react';
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
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [voiceSec, setVoiceSec] = useState(0);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const voiceRecRef = useRef(null); const voiceChunksRef = useRef([]); const voiceTimerRef = useRef(null); const voiceMaxRef = useRef(null);
  const [reward, setReward] = useState(null);
  const [claimingReward, setClaimingReward] = useState(false);
  const [viewsInfo, setViewsInfo] = useState({count:0,can_reveal:false,viewers:[]});

  useEffect(()=>{ if(profile) setForm({
    display_name:profile.display_name||'', bio:profile.bio||'', country:profile.country||'', ciudad:profile.ciudad||'',
    gender:profile.gender||'', seeking:profile.seeking||'', birth_year:profile.birth_year||'', ig_handle:profile.ig_handle||'',
    passport_city:profile.passport_city||'', incognito: !!profile.incognito, desire_mood: profile.desire_mood||''
  }); },[profile]);
  useEffect(()=>{ (async()=>{ const { data } = await supabase.rpc('get_received_whispers'); setWhispers(data||[]); })(); },[user]);
  useEffect(()=>{ supabase.rpc('touch_streak').then(()=>refreshProfile()).catch(()=>{}); },[]);
  const loadViews = async ()=>{ const { data } = await supabase.rpc('my_profile_views'); if(data) setViewsInfo(data); };
  useEffect(()=>{ loadViews(); },[user?.id]);

  const PLANS = [
    { id:'1m', label:'1 mes', price:'1,500 CUP', per:'1,500 CUP/mes', save:'Acceso total', note:'Ideal para probar el fuego.' },
    { id:'3m', label:'3 meses', price:'3,900 CUP', per:'1,300 CUP/mes', save:'Ahorras 600 CUP', note:'El punto dulce para conectar en serio.' },
    { id:'6m', label:'6 meses', price:'6,900 CUP', per:'1,150 CUP/mes', save:'Ahorras 2,100 CUP', note:'Para quien viene a quedarse en la calle.' },
  ];
  const selectedPlan = PLANS[planIdx] || PLANS[1];
  const isPrem = !!(profile?.premium_until && new Date(profile.premium_until) > new Date());
  const likesLimit = isPrem ? '∞' : 40;
  const likesLeft = isPrem ? '∞' : Math.max(0, 40 - (profile?.likes_today||0));
  const whisperLimit = isPrem ? 5 : 1;
  const whispersLeft = isPrem ? Math.max(0,5-(profile?.whispers_today||0)) : Math.max(0,1-(profile?.whispers_today||0));
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

  const claimReward = async () => {
    setClaimingReward(true);
    const { data, error } = await supabase.rpc('claim_daily_reward');
    setClaimingReward(false);
    if(error){ push(error.message,'err'); return; }
    setReward(data);
    if(data?.claimed) push('Ya abriste tu caja hoy. Vuelve mañana.','ok');
    else push('Caja abierta. Premio aplicado.','ok');
    refreshProfile(); loadViews();
  };

  const equipCosmetic = async (title, frame) => {
    const { error } = await supabase.rpc('equip_cosmetic', { p_title: title, p_frame: frame });
    if(error) push(error.message.includes('premium_required')?'Ese cosmético es Premium.':'No se pudo equipar','err');
    else { push('Estilo actualizado','ok'); refreshProfile(); }
  };
  const saveStreak = async () => {
    const { data, error } = await supabase.rpc('save_streak');
    if(error) push(error.message.includes('no_streak_save')?'Necesitas Premium o un salvavidas de racha.':'No se pudo salvar la racha','err');
    else { push(data?.msg||'Racha salvada','ok'); refreshProfile(); }
  };

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:true, noiseSuppression:true, sampleRate:44100 } });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : (MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':'');
      const mr = new MediaRecorder(stream, mime?{mimeType:mime, audioBitsPerSecond:24000}:{audioBitsPerSecond:24000});
      voiceChunksRef.current=[];
      mr.ondataavailable = (e)=>{ if(e.data.size>0) voiceChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t=>t.stop());
        if(voiceTimerRef.current) clearInterval(voiceTimerRef.current);
        if(voiceMaxRef.current) clearTimeout(voiceMaxRef.current);
        setRecordingVoice(false);
        const blob = new Blob(voiceChunksRef.current, {type: mr.mimeType||'audio/webm'});
        if(blob.size<1000) return push('Nota de voz muy corta','err');
        setUploadingVoice(true);
        try {
          const ext = (mr.mimeType||'').includes('ogg')?'ogg':(mr.mimeType||'').includes('mp4')?'m4a':'webm';
          const path = `${user.id}/voice/intro-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage.from('media').upload(path, blob, {contentType: mr.mimeType||'audio/webm', upsert:true});
          if(upErr) throw upErr;
          const { data:pub } = supabase.storage.from('media').getPublicUrl(path);
          const url = pub?.publicUrl||'';
          const { error } = await supabase.from('profiles').update({ voice_intro_url:url, voice_url:url }).eq('id', user.id);
          if(error) throw error;
          push('Voz del Malecón guardada','ok'); refreshProfile();
        } catch(err){ push(err.message||'No se pudo guardar la voz','err'); }
        finally { setUploadingVoice(false); }
      };
      voiceRecRef.current=mr; mr.start(250); setVoiceSec(0); setRecordingVoice(true);
      voiceTimerRef.current=setInterval(()=>setVoiceSec(s=>s+1),1000);
      voiceMaxRef.current=setTimeout(()=>{ if(voiceRecRef.current?.state==='recording') voiceRecRef.current.stop(); }, 60000);
    } catch { push('No pudimos acceder al micrófono','err'); }
  };
  const stopVoice = ()=>{ if(voiceRecRef.current?.state==='recording') voiceRecRef.current.stop(); };
  const cancelVoice = ()=>{ try{ if(voiceRecRef.current?.state==='recording'){ voiceRecRef.current.onstop=()=>voiceRecRef.current?.stream?.getTracks?.().forEach(t=>t.stop()); voiceRecRef.current.stop(); } }catch{} if(voiceTimerRef.current) clearInterval(voiceTimerRef.current); if(voiceMaxRef.current) clearTimeout(voiceMaxRef.current); setRecordingVoice(false); setVoiceSec(0); };

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

      <div className="glass" style={{padding:18,marginBottom:16}}>
        <div className="eyebrow">Todo lo que puedes hacer</div>
        <div style={{display:'grid',gap:8}}>
          {[['Voz en chats','En un chat, toca “Voz”, graba hasta 60s y suelta para enviar. También tienes Voz del Malecón en tu perfil.'],['Regalos de Lujuria','En chat toca “Regalo” para enviar Miradas, Suspiros o packs premium.'],['Caja diaria','Abre tu Caja de la Calle 1 vez al día: premios reales gratis.'],['Radar Calentón','Activa ubicación, filtra por intención/distancia y ponte “Disponible 30 min”.'],['La Calle','Publica de 20:00–05:00, responde la Pregunta del Día y entra a Afinidad.'],['Modos ciegos','Cuando toque Voz Ciega o Confesión Ciega, ligas sin ver perfil hasta el match.']].map(([t,d])=>(
            <div key={t} className="glass-dark" style={{padding:12,borderRadius:12}}><div style={{fontWeight:700,fontSize:'.86rem',color:'#F2C94C'}}>{t}</div><div style={{fontSize:'.8rem',color:'var(--pearl-muted)',lineHeight:1.5}}>{d}</div></div>
          ))}
        </div>
      </div>

      <div className="glass" style={{padding:18,marginBottom:16,display:'flex',gap:10,flexWrap:'wrap'}}>
        <button className="btn btn-glass btn-sm" onClick={loadLikedMe}>Quién me dio like</button>
        <button className="btn btn-glass btn-sm" onClick={requestVerification} disabled={profile?.verification_status==='pending'||profile?.verification_status==='verified'}>Pedir verificación</button>
        <button className="btn btn-glass btn-sm" onClick={async()=>{ const v=!profile?.incognito; const {error}=await supabase.from('profiles').update({incognito:v}).eq('id',user.id); if(error) push(error.message,'err'); else {push(v?'Modo incógnito activo':'Incógnito desactivado','ok'); refreshProfile();}}}>{profile?.incognito?'Desactivar incógnito':'Modo incógnito'}</button>
        <button className="btn btn-glass btn-sm" onClick={()=>{ navigator.clipboard?.writeText(window.location.origin+'/?ref='+ (profile?.id?.slice(0,8)||'')); push('Link de invitación copiado','ok'); }}>Invitar amigos</button>
      </div>

      <Beam size="md" colorVariant="sunset" strength={0.45}>
      <div className="glass-strong" style={{padding:20,marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}>
          <div>
            <div className="eyebrow">Caja de la Calle</div>
            <h3 style={{fontWeight:700,marginBottom:6}}>Una recompensa diaria, sin trucos</h3>
            <p style={{color:'var(--pearl-muted)',fontSize:'.86rem'}}>Abre tu caja cada día: boost, susurro extra, revelar visitas o foco radar. Gratis, una vez al día.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={claimReward} disabled={claimingReward}>{claimingReward?'Abriendo...':'Abrir caja'}</button>
        </div>
        {reward && (
          <div className="glass-dark" style={{marginTop:14,padding:14,borderRadius:14}}>
            <div style={{fontWeight:700,color:'#F2C94C'}}>
              {{boost_15m:'Boost 15 min activado',extra_whisper:'Susurro extra desbloqueado',reveal_views_1h:'Visitas reveladas por 1h',radar_spotlight:'Foco Radar 30 min activado'}[reward.reward_type] || 'Premio recibido'}
            </div>
            <div style={{fontSize:'.82rem',color:'var(--pearl-muted)',marginTop:4}}>{reward.claimed ? 'Ya reclamaste la caja de hoy.' : 'Se aplicó a tu cuenta al instante.'}</div>
          </div>
        )}
      </div>
      </Beam>

      <div className="glass" style={{padding:18,marginBottom:16}}>
        <div className="eyebrow">Lujuria · Deseo</div>
        <h3 style={{fontWeight:700,marginBottom:8}}>Vende la vibra, no la presión</h3>
        <p style={{color:'var(--pearl-muted)',fontSize:'.86rem',marginBottom:12}}>Regalos sensuales elegantes para subir la temperatura. Los gratis se recargan; los packs son opcionales.</p>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
          <span className="chip chip-laca">Calor: {profile?.desire_score||0}</span>
          {(profile?.desire_score||0)>=75 ? <span className="chip chip-laca">Leyenda del Deseo</span> : (profile?.desire_score||0)>=30 ? <span className="chip">Imán</span> : (profile?.desire_score||0)>=10 ? <span className="chip">Tentador</span> : <span className="chip">Entrando en calor</span>}
          {profile?.desire_mood && <span className="chip">{({charla:'Solo charla',quimica:'Química',lo_que_surja:'Lo que surja',fuego_discreto:'Fuego discreto'})[profile.desire_mood]||profile.desire_mood}</span>}
        </div>
        <div style={{display:'grid',gap:8}}>
          <div className="glass-dark" style={{padding:12,borderRadius:12,fontSize:'.84rem',color:'var(--pearl-dim)'}}><b style={{color:'#F2C94C'}}>Gratis:</b> Mirada y Suspiro se recargan cada día. Premium recibe más regalos gratis diarios.</div>
          <div className="glass-dark" style={{padding:12,borderRadius:12,fontSize:'.84rem',color:'var(--pearl-dim)'}}><b style={{color:'#F2C94C'}}>Packs CUP:</b> 5 Velas 800 · 5 Fuegos 1,400 · 3 Lunas Rojas 1,200 · Mix 2,000. Compra por WhatsApp, sin suscripción forzada.</div>
        </div>
        <a className="btn btn-glass btn-sm" style={{marginTop:12}} href={waLink(`Hola, quiero comprar un Pack Lujuria en Palacalle. Mi ID: ${user?.id}. Nombre: ${profile?.display_name||''}.`)} target="_blank" rel="noopener noreferrer">Comprar Pack Lujuria</a>
      </div>

      <div className="glass" style={{padding:18,marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:10}}>
          <div><div className="eyebrow" style={{marginBottom:4}}>Visitas misteriosas</div><div style={{fontWeight:700}}>{viewsInfo.count||0} personas te miraron en 24h</div></div>
          {!viewsInfo.can_reveal && <span className="chip">Revela con Premium o caja</span>}
        </div>
        {viewsInfo.can_reveal ? (
          viewsInfo.viewers?.length ? <div style={{display:'grid',gap:8}}>{viewsInfo.viewers.map(v=>(<div key={v.id} className="glass-dark" style={{padding:10,borderRadius:12,display:'flex',justifyContent:'space-between'}}><span>{v.display_name}</span><span style={{color:'var(--pearl-muted)',fontSize:'.78rem'}}>{v.ciudad||v.country||'Cerca'}</span></div>))}</div> : <p style={{color:'var(--pearl-muted)',fontSize:'.86rem'}}>Aún no hay visitas nuevas. Activa tu perfil y vuelve.</p>
        ) : <p style={{color:'var(--pearl-muted)',fontSize:'.86rem'}}>Alguien te está mirando. Abre la caja o activa Premium para ver quiénes fueron.</p>}
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

      <div className="glass" style={{padding:18,marginBottom:16}}>
        <div className="eyebrow">Voz del Malecón</div>
        <h3 style={{fontWeight:700,marginBottom:8}}>Tu voz vende más que mil fotos</h3>
        <p style={{color:'var(--pearl-muted)',fontSize:'.86rem',marginBottom:12}}>Graba una nota corta para tu perfil. La gente en el radar y tu perfil podrán escucharte.</p>
        {(profile?.voice_intro_url||profile?.voice_url) && <audio controls src={profile.voice_intro_url||profile.voice_url} style={{width:'100%',marginBottom:12}} />}
        {recordingVoice ? (
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <span className="chip chip-live">Grabando {voiceSec}s / 60s</span>
            <button className="btn btn-glass btn-sm" type="button" onClick={cancelVoice}>Cancelar</button>
            <button className="btn btn-primary btn-sm" type="button" onClick={stopVoice}>Guardar voz</button>
          </div>
        ) : (
          <button className="btn btn-glass btn-sm" type="button" onClick={startVoice} disabled={uploadingVoice}>{uploadingVoice?'Subiendo...':(profile?.voice_intro_url||profile?.voice_url)?'Grabar de nuevo':'Grabar mi voz'}</button>
        )}
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
            <div className="field"><label>Vibra / Deseo</label><select className="input" value={form.desire_mood||''} onChange={e=>setForm({...form,desire_mood:e.target.value})}><option value="">Elige tu vibra</option><option value="charla">Solo charla</option><option value="quimica">Química</option><option value="lo_que_surja">Lo que surja</option><option value="fuego_discreto">Fuego discreto</option></select></div>
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="btn btn-primary" disabled={saving}>{saving?'Guardando...':'Guardar cambios'}</button><button type="button" className="btn btn-glass" onClick={saveLocation}>Guardar mi ubicación</button></div>
        </form>
      </Beam>

      <div className="glass" style={{padding:18,marginBottom:16}}>
        <div className="eyebrow">Estatus y cosméticos</div>
        <h3 style={{fontWeight:700,marginBottom:8}}>Tu presencia en la calle</h3>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
          {profile?.cosmetic_title ? <span className="chip chip-laca">{profile.cosmetic_title}</span> : <span className="chip">Sin título</span>}
          {profile?.verification_status==='verified' && <span className="chip chip-laca">Verificada</span>}
          {(profile?.streak_count||0)>=7 && <span className="chip">Racha 7+</span>}
          {(profile?.streak_count||0)>=14 && <span className="chip">Racha 14+</span>}
          {isPrem && <span className="chip chip-laca">Premium</span>}
        </div>
        <div style={{fontSize:'.84rem',color:'var(--pearl-muted)',marginBottom:10}}>Títulos (algunos Premium):</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
          {['','Novato','Nocturno','Corazón caliente','Leyenda de la Calle','Malecón VIP'].map(t=>(
            <button key={t||'none'} className={`chip ${ (profile?.cosmetic_title||'')===t?'chip-laca':''}`} style={{cursor:'pointer'}} onClick={()=>equipCosmetic(t,null)}>{t||'Sin título'}</button>
          ))}
        </div>
        <div style={{fontSize:'.84rem',color:'var(--pearl-muted)',marginBottom:10}}>Marcos:</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[['default','Clásico'],['gold','Oro'],['ember','Brasa'],['neon','Neón'],['ice','Hielo']].map(([v,l])=>(
            <button key={v} className={`chip ${ (profile?.cosmetic_frame||'default')===v?'chip-laca':''}`} style={{cursor:'pointer'}} onClick={()=>equipCosmetic(null,v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="glass" style={{padding:18,marginBottom:16}}>
        <div className="eyebrow">Límites suaves, recarga natural</div>
        <h3 style={{fontWeight:700,marginBottom:8}}>Juega sin sentirte ahorcado</h3>
        <div style={{display:'grid',gap:8}}>
          <div className="glass-dark" style={{padding:12,borderRadius:12,display:'flex',justifyContent:'space-between'}}><span>Likes hoy</span><span style={{color:'#F2C94C'}}>{likesLeft} / {likesLimit}</span></div>
          <div className="glass-dark" style={{padding:12,borderRadius:12,display:'flex',justifyContent:'space-between'}}><span>Susurros hoy</span><span style={{color:'#F2C94C'}}>{whispersLeft} / {whisperLimit}</span></div>
          <div className="glass-dark" style={{padding:12,borderRadius:12,display:'flex',justifyContent:'space-between'}}><span>Racha</span><span style={{color:'#F2C94C'}}>{profile?.streak_count||0} días</span></div>
        </div>
        <p style={{fontSize:'.8rem',color:'var(--pearl-muted)',marginTop:10,lineHeight:1.6}}>Los likes y susurros se recargan cada día. La Caja de la Calle puede darte extras. Premium no te quita la diversión: te da más margen.</p>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>
          <button className="btn btn-glass btn-sm" onClick={saveStreak}>Salvar racha</button>
          <a className="btn btn-glass btn-sm" href={waLink(`Hola, quiero comprar un pase en Palacalle. Mi ID: ${user?.id}. Nombre: ${profile?.display_name||''}. Me interesa: [Boost 24h 400 CUP / 3 Susurros extra 250 CUP / Salvavidas de chispa 200 CUP / Marco cosmético 300 CUP]`)} target="_blank" rel="noopener noreferrer">Pases y extras</a>
        </div>
      </div>

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
