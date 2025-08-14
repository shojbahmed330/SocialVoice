

import React from 'react';

type IconName = 'mic' | 'like' | 'comment' | 'share' | 'play' | 'pause' | 'logo' | 'back' | 'settings' | 'add-friend' | 'message' | 'edit' | 'bell' | 'briefcase' | 'academic-cap' | 'home' | 'map-pin' | 'user-slash' | 'globe' | 'users' | 'lock-closed' | 'ellipsis-vertical' | 'trash' | 'speaker-wave' | 'swatch' | 'coin';

interface IconProps {
  name: IconName;
  className?: string;
}

const ICONS: Record<IconName, React.ReactNode> = {
  mic: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m12 0v-1.5a6 6 0 00-12 0v1.5m12 0v-1.5a6 6 0 00-12 0v1.5" />
    </svg>
  ),
  like: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  ),
  comment: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.158 2.075.34 3.074.493a51.697 51.697 0 01-1.222 3.65C6.517 20.65 6.22 21 5.922 21c-.3 0-.596-.35-1.02-.918l-1.42-1.42a1.5 1.5 0 010-2.12z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.76c0 1.6-1.123 2.994-2.707 3.227-1.068.158-2.075.34-3.074.493a51.697 51.697 0 001.222 3.65c.498.81.795 1.35.997 1.35.3 0 .596-.35 1.02-.918l1.42-1.42a1.5 1.5 0 000-2.12z" />
       <path strokeLinecap="round" strokeLinejoin="round" d="M15.585 17.585a3 3 0 01-4.242 0L10.5 16.75l-1.085 1.085a3 3 0 01-4.242 0l-.375-.375a3 3 0 010-4.242l4.5-4.5a3 3 0 014.242 0l1.085 1.085.375.375a3 3 0 010 4.242z" />
    </svg>
  ),
  share: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 100-2.186m0 2.186c-.18-.324-.283-.696-.283-1.093s.103-.77.283-1.093m0 2.186l-9.566-5.314" />
    </svg>
  ),
  play: (
     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
     </svg>
  ),
  pause: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
    </svg>
  ),
  logo: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m12 0v-1.5a6 6 0 00-12 0v1.5m12 0v-1.5a6 6 0 00-12 0v1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21a2.25 2.25 0 01-2.25-2.25v-8.25a2.25 2.25 0 012.25-2.25h.5a2.25 2.25 0 012.25 2.25v8.25a2.25 2.25 0 01-2.25 2.25h-.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 21a2.25 2.25 0 002.25-2.25v-8.25a2.25 2.25 0 00-2.25-2.25h-.5a2.25 2.25 0 00-2.25 2.25v8.25a2.25 2.25 0 002.25 2.25h.5z" />
    </svg>
  ),
  back: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  ),
  settings: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-1.226l.554-.222c.553-.222 1.203-.222 1.756 0l.554.222c.55.219 1.02.684 1.11 1.226l.092.552c.055.33.226.634.473.873l.406.393c.456.442 1.133.628 1.748.293l.523-.284c.542-.294 1.192-.12 1.62.269l.413.385c.428.398.636.98.52 1.558l-.133.682c-.126.643.059 1.303.535 1.748l.38.35c.484.447.737 1.09.61 1.723l-.133.682c-.116.578-.344 1.12-.702 1.558l-.413.385c-.428.398-1.078.562-1.62.269l-.523-.284a2.25 2.25 0 00-1.748.293l-.406.393c-.247.239-.418.543-.473.873l-.092.552c-.09.542-.56.907-1.11 1.126l-.554.222c-.553-.222-1.203-.222-1.756 0l-.554-.222c-.55-.219-1.02-.684-1.11-1.126l-.092-.552a2.25 2.25 0 01.473-.873l.406-.393a2.25 2.25 0 00-.293-1.748l-.284-.523c-.294-.542-.12-1.192.269-1.62l.385-.413a2.25 2.25 0 00-1.558-.52l-.682.133c-.643.126-1.303-.059-1.748-.535l-.35-.38a2.25 2.25 0 01-1.723-.61l-.682-.133c-.578-.116-1.12-.344-1.558-.702l-.385-.413a2.25 2.25 0 01-.269-1.62l.284-.523a2.25 2.25 0 00.293-1.748l-.393-.406a2.25 2.25 0 01-.873-.473l-.552-.092z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  'add-friend': (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.5 21h-5.026A12.318 12.318 0 014 19.235z" />
    </svg>
  ),
  'message': (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.72 3.72a1.05 1.05 0 01-1.664-1.243l1.26-3.784a1.05 1.05 0 00-.63-1.26l-3.783-1.26a1.05 1.05 0 01-1.243-1.664l3.72-3.72a1.05 1.05 0 00-1.26-.63l-1.26 3.783a1.05 1.05 0 01-1.664-1.243l3.72-3.72C8.512 8.347 9.38 7.5 10.5 7.5h4.286c.97 0 1.813.616 2.097 1.511z" />
    </svg>
  ),
  edit: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  ),
  bell: (
     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  briefcase: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.05a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.25A2.25 2.25 0 015.25 6H9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 3.75a2.25 2.25 0 012.25 2.25v2.25h-6.75V6A2.25 2.25 0 0115 3.75z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 3.75H9A2.25 2.25 0 006.75 6v2.25h10.5V6A2.25 2.25 0 0015 3.75z" />
    </svg>
  ),
  'academic-cap': (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path d="M12 14l9-5-9-5-9 5 9 5z" />
      <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-5.998 12.078 12.078 0 01.665-6.479L12 14z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-5.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222 4 2.222V20M12 13.778L18 17v-7.5l-6-3.333-6 3.333V17l6-3.222z" />
    </svg>
  ),
  home: (
     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" />
     </svg>
  ),
  'map-pin': (
     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
       <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
     </svg>
  ),
  'user-slash': (
     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75M13.5 10.5H21A2.25 2.25 0 0123.25 12.75v7.5A2.25 2.25 0 0121 22.5H3A2.25 2.25 0 01.75 20.25v-7.5A2.25 2.25 0 013 10.5h1.5M13.5 10.5a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V11.25a.75.75 0 01.75-.75z" />
       <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
     </svg>
  ),
  globe: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.52 9h16.96M3.52 15h16.96M9.04 3.52v16.96M14.96 3.52v16.96" />
    </svg>
  ),
  users: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-1.063M15 19.128c-.01-.01-.019-.02-.028-.03C12.44 17.16 9 14.684 9 10.5 9 6.316 12.44 3 15 3c2.69 0 6 2.684 6 6.502 0 4.184-3.44 6.66-6.028 8.618zM15 19.128v-2.176M9 10.5a3 3 0 11-6 0 3 3 0 016 0zM3 19.128c0-2.316.89-4.444 2.375-6.028" />
    </svg>
  ),
  'lock-closed': (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
  'ellipsis-vertical': (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
    </svg>
  ),
  trash: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09.92-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  ),
  'speaker-wave': (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5l.415-.207a.75.75 0 011.085.67V10.5m0 0h6m-6 0a.75.75 0 001.085.67l.415-.207M8.25 7.5V10.5M8.25 10.5a2.25 2.25 0 00-2.25 2.25v.75a2.25 2.25 0 002.25 2.25h.75a2.25 2.25 0 002.25-2.25v-.75a2.25 2.25 0 00-2.25-2.25h-.75z" />
       <path strokeLinecap="round" strokeLinejoin="round" d="M18.685 19.53a2.25 2.25 0 002.25-2.25V9A2.25 2.25 0 0018.75 6.75h-.75a2.25 2.25 0 00-2.25 2.25v7.5a2.25 2.25 0 002.25 2.25h.75z" />
    </svg>
  ),
  swatch: (
     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5" />
       <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
     </svg>
  ),
  coin: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

const Icon: React.FC<IconProps> = ({ name, className }) => {
  return (
    <div className={className}>
      {ICONS[name]}
    </div>
  );
};

export default Icon;