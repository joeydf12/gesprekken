import { hueOf, initials } from '../lib.js';

export default function Avatar({ person, size = 'md' }) {
  const src = person.avatar;
  return (
    <span className={'avatar ' + size} style={src ? undefined : { '--h': hueOf(person.id) }}>
      {src ? <img src={src} alt="" /> : initials(person.naam)}
    </span>
  );
}
