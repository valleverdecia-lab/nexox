import { BorderBeam } from 'border-beam';

export default function Beam({ children, className='', style, size='md', colorVariant='sunset', strength=0.55, active=true }) {
  return (
    <BorderBeam size={size} colorVariant={colorVariant} strength={strength} active={active}>
      <div className={className} style={style}>{children}</div>
    </BorderBeam>
  );
}
