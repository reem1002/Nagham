import { memo } from 'react';
import { SongCover } from './Cover.jsx';
import { IconMore, IconCheckCircle } from './Icons.jsx';
import { useCurrentSong, useDownloadState, useOnline, usePlayer, useSession } from '../lib/hooks.js';
import { playSong, canPlay } from '../player/engine.js';
import { openSheet } from './Sheet.jsx';
import { fmtTime } from '../lib/format.js';
import { toast } from './Toast.jsx';

export function Eq({ paused }) {
  return (
    <span className={`eq ${paused ? 'paused' : ''}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

export function DownloadBadge({ id }) {
  const d = useDownloadState(id);
  if (!d) return null;
  if (d.status === 'done') return <span className="dl" title="Available offline"><IconCheckCircle size={14} /></span>;
  if (d.status === 'downloading' || d.status === 'queued')
    return (
      <span className="dl ring" title="Downloading" style={{ '--p': d.progress || 0 }}>
        <svg width="14" height="14" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" fill="none" stroke="var(--surface-3)" strokeWidth="3" />
          <circle cx="10" cy="10" r="8" fill="none" stroke="var(--accent)" strokeWidth="3" strokeDasharray={`${(d.progress || 0) * 50.3} 50.3`} transform="rotate(-90 10 10)" />
        </svg>
      </span>
    );
  return null;
}

function SongRowInner({ song, list, number, showCover = true, playlistId, subtitle }) {
  const current = useCurrentSong();
  const playing = usePlayer((s) => s.playing);
  useOnline();
  useSession();
  useDownloadState(song._id);
  const isCurrent = current?._id === song._id;
  const available = canPlay(song);

  const onClick = () => {
    if (!available) {
      toast('Not downloaded — connect to the internet to play this one');
      return;
    }
    playSong(song, list?.filter(canPlay));
  };

  return (
    <div
      className={`song-row ${isCurrent ? 'playing' : ''} ${available ? '' : 'unavailable'}`}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        openSheet('song', { song, playlistId });
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {number != null && <span className="num">{isCurrent ? <Eq paused={!playing} /> : number}</span>}
      {showCover && <SongCover song={song} size={48} radius={10} />}
      <div className="meta">
        <div className="title truncate" dir="auto">
          {song.title}
        </div>
        <div className="sub">
          <DownloadBadge id={song._id} />
          <span className="truncate" dir="auto">
            {subtitle ?? song.artist?.name ?? 'Unknown Artist'}
          </span>
        </div>
      </div>
      {song.duration > 0 && <span className="dur">{fmtTime(song.duration)}</span>}
      <button
        className="icon-btn more"
        aria-label="More options"
        onClick={(e) => {
          e.stopPropagation();
          openSheet('song', { song, playlistId });
        }}
      >
        <IconMore size={20} />
      </button>
    </div>
  );
}

export const SongRow = memo(SongRowInner);

export function SongList({ songs, numbered, showCover = true, playlistId, subtitle }) {
  return (
    <div className="list">
      {songs.map((s, i) => (
        <SongRow key={`${s._id}-${i}`} song={s} list={songs} number={numbered ? s.trackNo || i + 1 : null} showCover={showCover} playlistId={playlistId} subtitle={subtitle?.(s)} />
      ))}
    </div>
  );
}
