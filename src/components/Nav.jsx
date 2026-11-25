import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Icon = ({d,d2}) => (<svg viewBox="0 0 24 24"><path d={d}/>{d2?<path d={d2}/>:null}</svg>);
const items = [
 {to:'/app', label:'Descubrir', icon:'M12 21s-7-4.4-9.3-9A5.5 5.5 0 0 1 12 5.7 5.5 5.5 0 0 1 21.3 12c-2.3 4.6-9.3 9-9.3 9z', end:true},
 {to:'/app/calle', label:'La Calle', icon:'M4 5h16v10H7l-3 3V5z'},
 {to:'/app/calenton', label:'Calentón', icon:'M12 2c2 3 5 5 5 9a5 5 0 1 1-10 0c0-2 1-4 2-5 0 2 1 3 2 3 1-2 1-4 1-7z'},
 {to:'/app/chats', label:'Chats', icon:'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'},
 {to:'/app/groups', label:'OF', icon:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'},
 {to:'/app/perfil', label:'Perfil', icon:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'},
];

export default function Nav() {
 const { effectiveOwner } = useAuth();
 return (
  <nav className="nav-bar">
   <div className="nav-bar-inner glass">
    {items.map(it => (
     <NavLink key={it.to} to={it.to} end={it.end} className={({isActive})=>`nav-item ${isActive?'active':''}`}>
      <Icon d={it.icon} />
      <span>{it.label}</span>
     </NavLink>
    ))}
    {effectiveOwner && (
     <NavLink to="/app/admin" className={({isActive})=>`nav-item ${isActive?'active':''}`}>
      <Icon d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z" />
      <span>Admin</span>
     </NavLink>
    )}
   </div>
  </nav>
 );
}
