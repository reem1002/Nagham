import { useNavigate } from 'react-router-dom';
import { useAsync, useLibraryVersion, useDownloadsReady, useSession } from '../lib/hooks.js';
import { loadArtists } from '../lib/data.js';
import { Cover } from '../components/Cover.jsx';
import { BackBar, Loading, ErrorState, Empty, OfflineBanner } from '../components/Common.jsx';
import { IconUser } from '../components/Icons.jsx';
import { mediaUrl } from '../api/client.js';
import { coverFor } from '../lib/downloads.js';
import { plural } from '../lib/format.js';

export default function Artists() {
  const v = useLibraryVersion();
  const ready = useDownloadsReady();
  const session = useSession();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => (ready ? loadArtists() : new Promise(() => {})), [v, ready, session.status]);
  const artists = data?.artists.filter((a) => a.songCount > 0 || a.bio) || [];

  return (
    <div className="page">
      <BackBar />
      <h1 className="page-title">Artists</h1>
      {loading && !data ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : !artists.length ? (
        <Empty icon={<IconUser />} title="No artists yet" text="Artists appear automatically from your songs' tags." />
      ) : (
        <>
          <OfflineBanner stale={data.stale} />
          <div className="grid-2 artists-grid">
            {artists.map((a) => (
              <div key={a._id} className="tile round" style={{ width: 'auto' }} onClick={() => navigate(`/artists/${a._id}`)}>
                <Cover src={a.image ? mediaUrl(a.image) : coverFor(a.sample)} seed={a.name} round style={{ width: '100%', height: 'auto', aspectRatio: 1 }} />
                <div className="t truncate" dir="auto">{a.name}</div>
                <div className="s">{plural(a.songCount, 'song')}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
