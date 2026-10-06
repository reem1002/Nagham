import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAsync, useLibraryVersion, useDownloadsReady } from '../lib/hooks.js';
import { loadArtist } from '../lib/data.js';
import { Cover } from '../components/Cover.jsx';
import { SongList } from '../components/SongRow.jsx';
import { CollectionActions } from '../components/CollectionActions.jsx';
import { BackBar, Loading, ErrorState, OfflineBanner, Empty } from '../components/Common.jsx';
import { IconImport } from '../components/Icons.jsx';
import { mediaUrl } from '../api/client.js';
import { coverFor } from '../lib/downloads.js';
import { fmtDuration, plural } from '../lib/format.js';

export default function ArtistDetail() {
  const { id } = useParams();
  const v = useLibraryVersion();
  const ready = useDownloadsReady();
  const navigate = useNavigate();
  const [bioOpen, setBioOpen] = useState(false);
  const { data, loading, error, reload } = useAsync(() => (ready ? loadArtist(id) : new Promise(() => {})), [id, v, ready]);

  if (loading && !data) return <div className="page"><BackBar /><Loading /></div>;
  if (error) return <div className="page"><BackBar /><ErrorState error={error} onRetry={reload} /></div>;
  const { artist, stale } = data;
  const img = artist.image ? mediaUrl(artist.image) : coverFor(artist.songs[0]);
  const duration = artist.songs.reduce((t, s) => t + (s.duration || 0), 0);

  return (
    <div className="page">
      <div className="hero">
        {img && <div className="hero-bg" style={{ backgroundImage: `url("${img}")` }} />}
        <BackBar />
        <Cover src={img} seed={artist.name} className="hero-cover round" />
        <h1 dir="auto" style={{ textAlign: 'center' }}>{artist.name}</h1>
        <div className="meta-line" style={{ textAlign: 'center' }}>
          {plural(artist.songs.length, 'song')} · {plural(artist.albums?.length || 0, 'album')} · {fmtDuration(duration)}
        </div>
        {artist.songs.length > 0 && <CollectionActions songs={artist.songs} />}
      </div>
      <OfflineBanner stale={stale} />

      {artist.bio && (
        <div className={`bio ${bioOpen ? 'open' : ''}`} onClick={() => setBioOpen((o) => !o)}>
          {artist.bio.split('\n').filter(Boolean).map((para, i) => (
            <p key={i} dir="auto">{para}</p>
          ))}
        </div>
      )}

      {!artist.songs.length && (
        <Empty icon={<IconImport />} title="No songs here yet" text={`Import files tagged “${artist.name}” (any spelling) and they'll be grouped here automatically.`}>
          <button className="btn btn-primary" onClick={() => navigate(`/import?artist=${encodeURIComponent(artist.name)}`)}>Import for this artist</button>
        </Empty>
      )}

      {artist.songs.length > 0 && (
        <section className="section">
          <div className="section-head"><h2 className="section-title">Songs</h2></div>
          <SongList songs={artist.songs} subtitle={(s) => s.album?.title} />
        </section>
      )}

      {artist.albums?.length > 0 && (
        <section className="section">
          <div className="section-head"><h2 className="section-title">Albums</h2></div>
          <div className="shelf">
            {artist.albums.map((a) => (
              <div key={a._id} className="tile" onClick={() => navigate(`/albums/${a._id}`)}>
                <Cover src={a.cover ? mediaUrl(a.cover) : coverFor(a.sample || artist.songs.find((s) => s.album?._id === a._id))} seed={a.title} />
                <div className="t truncate" dir="auto">{a.title}</div>
                <div className="s">{a.year ? `${a.year} · ` : ''}{plural(a.songCount || 0, 'song')}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
