// Small inline icon set (24×24, stroke-based) so the app has no icon-font dependency offline.
const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

const make = (paths, extra = {}) =>
  function Icon({ size = 22, ...props }) {
    return (
      <svg {...base} {...extra} width={size} height={size} aria-hidden="true" {...props}>
        {paths}
      </svg>
    );
  };

export const IconHome = make(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></>);
export const IconSearch = make(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const IconLibrary = make(<><path d="M4 4v16" /><path d="M8.5 4v16" /><path d="m13 4.5 4.5 15.5" /><path d="M13 4.5 17 3.5l4.5 15.5-4 1" /></>);
export const IconImport = make(<><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>);
export const IconSettings = make(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>);
export const IconPlay = make(<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor" stroke="none" />);
export const IconPause = make(<><rect x="6" y="4" width="4" height="16" rx="1.2" fill="currentColor" stroke="none" /><rect x="14" y="4" width="4" height="16" rx="1.2" fill="currentColor" stroke="none" /></>);
export const IconNext = make(<><path d="M5 5.2v13.6a.8.8 0 0 0 1.2.7L16 13v-2L6.2 4.5a.8.8 0 0 0-1.2.7z" fill="currentColor" stroke="none" /><rect x="16.5" y="4.5" width="2.6" height="15" rx="1.1" fill="currentColor" stroke="none" /></>);
export const IconPrev = make(<><path d="M19 5.2v13.6a.8.8 0 0 1-1.2.7L8 13v-2l9.8-6.5a.8.8 0 0 1 1.2.7z" fill="currentColor" stroke="none" /><rect x="4.9" y="4.5" width="2.6" height="15" rx="1.1" fill="currentColor" stroke="none" /></>);
export const IconShuffle = make(<><path d="M16 3h5v5" /><path d="M4 20 21 3" /><path d="M21 16v5h-5" /><path d="m15 15 6 6" /><path d="M4 4l5 5" /></>);
export const IconRepeat = make(<><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></>);
export const IconHeart = make(<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />);
export const IconHeartFill = make(<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" fill="currentColor" />);
export const IconMore = make(<><circle cx="5" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="19" cy="12" r="1.3" fill="currentColor" /></>);
export const IconBack = make(<path d="m15 18-6-6 6-6" />);
export const IconChevron = make(<path d="m9 18 6-6-6-6" />);
export const IconDown = make(<path d="m6 9 6 6 6-6" />);
export const IconQueue = make(<><path d="M3 6h13" /><path d="M3 12h13" /><path d="M3 18h8" /><path d="M18 14v7" /><circle cx="16" cy="20" r="2" /><path d="M18 14l3-1" /></>);
export const IconLyrics = make(<><path d="M4 5h16" /><path d="M4 10h11" /><path d="M4 15h16" /><path d="M4 20h8" /></>);
export const IconVolume = make(<><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>);
export const IconMute = make(<><path d="M11 5 6 9H3v6h3l5 4z" /><path d="m22 9-6 6" /><path d="m16 9 6 6" /></>);
export const IconDownload = make(<><path d="M12 4v11" /><path d="m7.5 11 4.5 4.5 4.5-4.5" /><path d="M5 20h14" /></>);
export const IconCheckCircle = make(<><circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" /><path d="m8 12.5 2.6 2.5L16 9.5" stroke="#08170d" strokeWidth="2.2" /></>);
export const IconOffline = make(<><path d="m2 2 20 20" /><path d="M8.5 16.5a5 5 0 0 1 7 0" /><path d="M5 12.6a10 10 0 0 1 5.2-2.6" /><path d="M2 8.8a15 15 0 0 1 4.2-2.7" /><path d="M16.9 10.9A10 10 0 0 1 19 12.6" /><path d="M10.7 5.1A15 15 0 0 1 22 8.8" /><circle cx="12" cy="20" r="0.8" fill="currentColor" /></>);
export const IconPlus = make(<><path d="M12 5v14" /><path d="M5 12h14" /></>);
export const IconClose = make(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
export const IconTrash = make(<><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" /><path d="M9 7V4h6v3" /></>);
export const IconEdit = make(<><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>);
export const IconUser = make(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>);
export const IconAlbum = make(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /></>);
export const IconMusic = make(<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>);
export const IconList = make(<><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><circle cx="3.5" cy="6" r="1" fill="currentColor" /><circle cx="3.5" cy="12" r="1" fill="currentColor" /><circle cx="3.5" cy="18" r="1" fill="currentColor" /></>);
export const IconFolder = make(<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />);
export const IconStats = make(<><rect x="4" y="11" width="4" height="9" rx="1" /><rect x="10" y="5" width="4" height="15" rx="1" /><rect x="16" y="8" width="4" height="12" rx="1" /></>);
export const IconPin = make(<><path d="M9 3h6" /><path d="M10 3v6l-3 4h10l-3-4V3" /><path d="M12 13v8" /></>);
export const IconDrag = make(<><circle cx="9" cy="6" r="1" fill="currentColor" /><circle cx="15" cy="6" r="1" fill="currentColor" /><circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" /><circle cx="9" cy="18" r="1" fill="currentColor" /><circle cx="15" cy="18" r="1" fill="currentColor" /></>);
export const IconMoon = make(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />);
export const IconNextUp = make(<><path d="M3 6h11" /><path d="M3 12h7" /><path d="M3 18h7" /><path d="M14 12l7 3.5-7 3.5z" fill="currentColor" /></>);
export const IconCloud = make(<path d="M17.5 19a4.5 4.5 0 1 0-1-8.9A6 6 0 0 0 5 11.5 4 4 0 0 0 6 19z" />);
export const IconPhone = make(<><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M11 18h2" /></>);
