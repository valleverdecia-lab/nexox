import { createContext, useContext, useState, useCallback } from 'react';

const DICT = {
  es: {
    nav_discover:'Descubrir', nav_street:'La Calle', nav_heat:'Calentón', nav_chats:'Chats', nav_groups:'Grupos', nav_profile:'Perfil', nav_admin:'Admin',
    landing_eyebrow:'Conexiones reales · Cuba × Mundo', landing_title_a:'Donde Cuba ', landing_title_b:'se cruza', landing_title_c:' contigo.', landing_sub:'Palacalle es el punto de encuentro entre cubanos y personas de Europa, EE. UU. y Latinoamérica que quieren algo más que un swipe vacío. Elegante, cercano, real.',
    landing_live:'En vivo ahora', landing_whispers:'Susurros', landing_street:'La Calle 20:00–05:00',
    login:'Entrar', register:'Crear cuenta', email:'Correo', phone:'Teléfono', name:'Tu nombre', password:'Contraseña', enter:'Entrar a Palacalle', create_account:'Crear mi cuenta', loading:'Un momento...',
    name_ph:'Cómo te llamas en la calle', pass_ph:'Mínimo 6 caracteres',
    discover_eyebrow:'Descubrir', discover_title_a:'Personas que ', discover_title_b:'valen la pena', edit_profile:'Editar perfil', undo:'Deshacer',
    street_eyebrow:'La Calle', chats_eyebrow:'Chats', heat_eyebrow:'Modo Calentón', profile_eyebrow:'Tu perfil', groups_eyebrow:'Modo OF',
    lang:'Idioma', spanish:'Español', english:'English',
    save:'Guardar cambios', saving:'Guardando...', logout:'Salir',
    premium:'Premium', activate:'Activar', free:'Gratis',
  },
  en: {
    nav_discover:'Discover', nav_street:'The Street', nav_heat:'Heat', nav_chats:'Chats', nav_groups:'Groups', nav_profile:'Profile', nav_admin:'Admin',
    landing_eyebrow:'Real connections · Cuba × World', landing_title_a:'Where Cuba ', landing_title_b:'meets', landing_title_c:' you.', landing_sub:'Palacalle is where Cubans and people from Europe, the US, and Latin America meet for more than an empty swipe. Elegant, close, real.',
    landing_live:'Live now', landing_whispers:'Whispers', landing_street:'The Street 20:00–05:00',
    login:'Sign in', register:'Create account', email:'Email', phone:'Phone', name:'Your name', password:'Password', enter:'Enter Palacalle', create_account:'Create my account', loading:'One moment...',
    name_ph:'What they call you on the street', pass_ph:'At least 6 characters',
    discover_eyebrow:'Discover', discover_title_a:'People who are ', discover_title_b:'worth it', edit_profile:'Edit profile', undo:'Undo',
    street_eyebrow:'The Street', chats_eyebrow:'Chats', heat_eyebrow:'Heat Mode', profile_eyebrow:'Your profile', groups_eyebrow:'OF Mode',
    lang:'Language', spanish:'Español', english:'English',
    save:'Save changes', saving:'Saving...', logout:'Log out',
    premium:'Premium', activate:'Activate', free:'Free',
  }
};

const LangCtx = createContext(null);
export const useLang = () => useContext(LangCtx);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('pc_lang') || 'es');
  const setLang = useCallback((l) => { setLangState(l); localStorage.setItem('pc_lang', l); document.documentElement.lang = l; }, []);
  const t = useCallback((k) => DICT[lang]?.[k] || DICT.es[k] || k, [lang]);
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}
