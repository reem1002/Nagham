import { Link, useParams } from 'react-router-dom';
import { useAsync, useLibraryVersion, useDownloadsReady } from '../lib/hooks.js';
import { loadAlbum } from '../lib/data.js';
import { Cover } from '../components/Cover.jsx';
import { SongList } from '../components/SongRow.jsx';
import { CollectionActions } from '../components/CollectionActions.jsx';
import { BackBar, Loading, ErrorState, OfflineBanner } from '../components/Common.jsx';
import { mediaUrl } from '../api/client.js';
import { coverFor } from '../lib/downloads.js';
import { fmtDuration, plural } from '../lib/format.js';

export default function AlbumDetail() {
  const { id } = useParams();
  const v = useLibraryVersion();
  const ready = useDownloadsReady();
  const { data, loading, error, reload } = useAsync(() => (ready ? loadAlbum(id) : new Promise(() => {})), [id, v, ready]);

  if (loading && !data) return <div className="page"><BackBar /><Loading /></div>;
  if (error) return <div className="page"><BackBar /><ErrorState error={error} onRetry={reload} /></div>;
  const { album, stale } = data;
  const img = album.cover ? mediaUrl(album.cover) : coverFor(album.songs[0]);
  const duration = album.songs.reduce((t, s) => t + (s.duration || 0), 0);

  return (
    <div className="page">
      <div className="hero">
        {img && <div className="hero-bg" style={{ backgroundImage: `url("${img}")` }} />}
        <BackBar />
        <Cover src={img} seed={album.title} className="hero-cover" />
        <h1 dir="auto">{album.title}</h1>
        <div className="meta-line">
          {album.artist?._id ? <Link to={`/artists/${album.artist._id}`} style={{ color: 'var(--text)', fontWeight: 600 }} dir="auto">{album.artist.name}</Link> : null}
          {' · '}
          {album.year ? `${album.year} · ` : ''}
          {plural(album.songs.length, 'song')} · {fmtDuration(duration)}
        </div>
        <CollectionActions songs={album.songs} />
      </div>
      <OfflineBanner stale={stale} />
      <SongList songs={album.songs} numbered showCover={false} />
    </div>
  );
}
