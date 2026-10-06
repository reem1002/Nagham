import { useNavigate } from 'react-router-dom';
import { SongCover } from './Cover.jsx';
import { IconPlay, IconPause, IconNext } from './Icons.jsx';
import { MiniProgress } from './Seek.jsx';
import { useCurrentSong, usePlayer } from '../lib/hooks.js';
import { toggle, next } from '../player/engine.js';

export function MiniPlayer() {
  const song = useCurrentSong();
  const playing = usePlayer((s) => s.playing);
  const loading = usePlayer((s) => s.loading);
  const navigate = useNavigate();
  if (!song) return null;
  return (
    <div className="mini-player" onClick={() => navigate('/playing')} role="button" aria-label="Open player">
      <SongCover song={song} size={46} round className={playing ? 'spin-slow' : 'spin-slow paused'} />
      <div className="mini-meta">
        <div className="mini-artist truncate" dir="auto">{song.artist?.name}</div>
        <div className="mini-title truncate" dir="auto">{song.title}</div>
        <MiniProgress />
      </div>
      <button
        className="icon-btn mini-play"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
      >
        {loading && playing ? <span className="spinner" /> : playing ? <IconPause size={24} /> : <IconPlay size={24} />}
      </button>
      <button
        className="icon-btn"
        aria-label="Next"
        onClick={(e) => {
          e.stopPropagation();
          next();
        }}
      >
        <IconNext size={20} />
      </button>
    </div>
  );
}
