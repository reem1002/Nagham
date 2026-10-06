import { useState } from 'react';
import { gradientFor, initials } from '../lib/format.js';
import { coverFor } from '../lib/downloads.js';
import { mediaUrl } from '../api/client.js';

/** Artwork with a generated gradient fallback when there's no image (or it fails offline). */
export function Cover({ src, seed = '', size, radius, round, className = '', style, label }) {
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;
  return (
    <div
      className={`cover ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: round ? '50%' : radius,
        background: showImg ? undefined : gradientFor(seed),
        ...style,
      }}
    >
      {showImg ? (
        <img src={src} alt="" loading="lazy" draggable="false" onError={() => setFailed(true)} />
      ) : (
        <span className="fallback" style={{ fontSize: size ? Math.max(12, size * 0.36) : 40 }}>
          {label ?? initials(seed)}
        </span>
      )}
    </div>
  );
}

export function SongCover({ song, ...props }) {
  return <Cover key={song?._id} src={coverFor(song)} seed={song?.album?.title || song?.title || ''} {...props} />;
}

/** 2×2 mosaic for playlists. */
export function PlaylistCover({ playlist, size, radius = 14, className = '' }) {
  const fromSongs = (playlist.coverSongs || []).map((s) => coverFor(s)).filter(Boolean);
  const urls = fromSongs.length ? fromSongs : (playlist.covers || []).map(mediaUrl);
  if (urls.length >= 4) {
    return (
      <div className={`cover ${className}`} style={{ width: size, height: size, borderRadius: radius }}>
        <div className="cover-grid">
          {urls.slice(0, 4).map((u, i) => (
            <img key={i} src={u} alt="" style={{ width: '100%', aspectRatio: 1, objectFit: 'cover' }} />
          ))}
        </div>
      </div>
    );
  }
  return <Cover src={urls[0]} seed={playlist.name} size={size} radius={radius} className={className} />;
}
