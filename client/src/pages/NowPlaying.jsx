import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SongCover } from '../components/Cover.jsx';
import { SeekBar } from '../components/Seek.jsx';
import { QueueSheet } from '../components/QueueSheet.jsx';
import { DownloadBadge } from '../components/SongRow.jsx';
import { openSheet } from '../components/Sheet.jsx';
import {
  IconDown, IconMore, IconPlay, IconPause, IconNext, IconPrev, IconShuffle, IconRepeat, IconHeart, IconHeartFill, IconQueue, IconLyrics, IconVolume, IconMute, IconMoon,
} from '../components/Icons.jsx';
import { useCurrentSong, usePlayer, useIsFavorite } from '../lib/hooks.js';
import { toggle, next, prev, toggleShuffle, cycleRepeat, setVolume, toggleMute } from '../player/engine.js';
import { toggleFavorite } from '../lib/favorites.js';
import { coverFor } from '../lib/downloads.js';

export default function NowPlaying() {
  const navigate = useNavigate();
  const song = useCurrentSong();
  const { playing, loading, shuffle, repeat, volume, muted, sleepAt, queue, index } = usePlayer();
  const fav = useIsFavorite(song?._id);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const close = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  if (!song) {
    return (
      <div className="np np-empty">
        <button className="icon-btn" onClick={close} aria-label="Close"><IconDown /></button>
        <div className="empty">
          <h3>Nothing playing</h3>
          <p>Pick a song from your library to start listening.</p>
          <Link to="/library" className="btn btn-primary">Open library</Link>
        </div>
      </div>
    );
  }

  const art = coverFor(song);

  return (
    <div className="np">
      <div className="np-bg" style={art ? { backgroundImage: `url("${art}")` } : undefined} />
      <div className="np-inner">
        <header className="np-top">
          <button className="icon-btn" onClick={close} aria-label="Close player"><IconDown size={26} /></button>
          <div className="np-context">
            <span>Now playing</span>
            <strong>{index + 1} of {queue.length}</strong>
          </div>
          <button className="icon-btn" onClick={() => openSheet('song', { song })} aria-label="Song options"><IconMore /></button>
        </header>

        <div className="np-stage">
          {showLyrics ? (
            <div className="np-lyrics" dir="auto">
              {song.lyrics ? (
                song.lyrics.split('\n').map((line, i) => <p key={i}>{line || ' '}</p>)
              ) : (
                <div className="empty" style={{ padding: 20 }}>
                  <h3>No lyrics yet</h3>
                  <p>Add them from “Edit info & lyrics”. Files with embedded lyrics show them automatically.</p>
                  <button className="btn btn-ghost btn-sm" onClick={() => openSheet('editSong', { song })}>Add lyrics</button>
                </div>
              )}
            </div>
          ) : (
            <div className={`np-art ${playing ? '' : 'paused'}`}>
              <SongCover song={song} radius={26} className="np-cover" />
            </div>
          )}
        </div>

        <div className="np-info">
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 className="truncate" dir="auto">{song.title}</h1>
            <Link to={song.artist?._id ? `/artists/${song.artist._id}` : '#'} className="np-artist truncate" dir="auto">
              {song.artist?.name || 'Unknown Artist'}
            </Link>
          </div>
          <span className="np-dl"><DownloadBadge id={song._id} /></span>
          <button className={`icon-btn ${fav ? 'accent' : ''}`} onClick={() => toggleFavorite(song)} aria-label={fav ? 'Unfavorite' : 'Favorite'}>
            {fav ? <IconHeartFill size={26} /> : <IconHeart size={26} />}
          </button>
        </div>

        <SeekBar />

        <div className="np-controls">
          <button className={`icon-btn ${shuffle ? 'accent dot' : ''}`} onClick={toggleShuffle} aria-label="Shuffle" aria-pressed={shuffle}>
            <IconShuffle />
          </button>
          <button className="icon-btn big" onClick={prev} aria-label="Previous"><IconPrev size={30} /></button>
          <button className="play-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
            {loading && playing ? <span className="spinner dark" /> : playing ? <IconPause size={32} /> : <IconPlay size={32} />}
          </button>
          <button className="icon-btn big" onClick={() => next()} aria-label="Next"><IconNext size={30} /></button>
          <button className={`icon-btn ${repeat !== 'off' ? 'accent dot' : ''}`} onClick={cycleRepeat} aria-label={`Repeat ${repeat}`}>
            <IconRepeat />
            {repeat === 'one' && <span className="repeat-one">1</span>}
          </button>
        </div>

        <div className="np-bottom">
          <button className={`icon-btn ${showLyrics ? 'accent' : ''}`} onClick={() => setShowLyrics((v) => !v)} aria-label="Lyrics"><IconLyrics /></button>
          <div className="np-volume">
            <button className="icon-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted || volume === 0 ? <IconMute size={20} /> : <IconVolume size={20} />}
            </button>
            <input
              type="range"
              className="range thin"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              style={{ '--p': `${(muted ? 0 : volume) * 100}%`, '--b': '0%' }}
              aria-label="Volume"
            />
          </div>
          <button className={`icon-btn ${sleepAt ? 'accent' : ''}`} onClick={() => openSheet('sleep')} aria-label="Sleep timer"><IconMoon size={20} /></button>
          <button className="icon-btn" onClick={() => setShowQueue(true)} aria-label="Queue"><IconQueue /></button>
        </div>
      </div>
      <QueueSheet open={showQueue} onClose={() => setShowQueue(false)} />
    </div>
  );
}
