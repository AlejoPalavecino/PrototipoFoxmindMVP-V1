import type { FoxmindIconProps } from './FoxmindIcon';
import { FoxmindIcon } from './FoxmindIcon';

// Approved UI Lab paths, opt-in only for Home and its navigation.
const paths:Record<string,string>={
 'home':'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
 'book':'M12 6v15M3 4h4a6 6 0 0 1 5 2 6 6 0 0 1 5-2h4v15h-4a6 6 0 0 0-5 2 6 6 0 0 0-5-2H3Z',
 'layers':'m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
 'calendar':'M4 5h16v16H4ZM8 3v4m8-4v4M4 10h16M8 14h2m4 0h2m-8 4h2',
 'bell':'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
 'arrow-right':'M4 12h16m-6-6 6 6-6 6',
 'arrow-left':'M20 12H4m6-6-6 6 6 6',
 'chevron-right':'m9 5 7 7-7 7',
 'plus':'M12 5v14M5 12h14',
 'close':'m6 6 12 12M18 6 6 18',
 'check':'m5 12 4 4L19 6',
 'search':'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
 'spark':'m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4ZM20 2v4m-2-2h4',
 'folder':'M3 6h7l2 3h9v11H3ZM3 6V4h6l2 2',
 'clock':'M12 7v5l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 'file':'M14 3H5v18h14V8Zm0 0v5h5M8 12h8m-8 4h5',
 'chat':'M4 4h16v13H9l-5 4V4Zm4 5h8m-8 4h5',
 'users':'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0m4-3a4 4 0 0 1 0 8',
 'settings':'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z',
 'menu':'M4 6h16M4 12h16M4 18h16',
 'edit':'m16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5',
 'play':'m8 4 12 8-12 8V4Z',
};
export function HomeReferenceIcon({name,className=''}:Omit<FoxmindIconProps,'name'>&{name:FoxmindIconProps['name']|'play'}){
 const path=paths[name];
 if(!path)return <FoxmindIcon name={name==='play'?'arrow-right':name} className={className}/>;
 return <svg className={`fm3d-icon ${className}`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={path}/></svg>;
}
