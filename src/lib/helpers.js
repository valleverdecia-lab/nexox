import { WHATSAPP_NUMBER, EVENTS } from './config';
export const uid = () => Math.random().toString(36).slice(2,10);
export const getAutoEvent = (d=new Date()) => {
  const dayIndex = Math.floor(Math.floor(d.getTime()/86400000) / 2);
  return EVENTS[dayIndex % EVENTS.length];
};
export const fmtDate = (iso) => { if(!iso) return ''; const d=new Date(iso); return d.toLocaleDateString('es-ES',{day:'2-digit',month:'short'}); };
export const fmtTime = (iso) => { if(!iso) return ''; const d=new Date(iso); return d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}); };
export const timeAgo = (iso) => {
 if(!iso) return ''; const s=(Date.now()-new Date(iso).getTime())/1000;
 if(s<60) return 'ahora'; if(s<3600) return `${Math.floor(s/60)}m`; if(s<86400) return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`;
};
export const ageFromYear = (y) => { if(!y) return null; return new Date().getFullYear()-Number(y); };
export const distanceLabel = (km) => { if(km==null) return 'Cerca'; if(km<1) return `${Math.round(km*1000)} m`; return `${km.toFixed(1)} km`; };
export const waLink = (text) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
export const initials = (name='?') => name.split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()||'').join('');
export const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
export const isBoardOpen = () => { const h = new Date().getHours(); return h>=20 || h<5; }; // 20:00-05:00
export const boardWindowLabel = '20:00 – 05:00';
export const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
