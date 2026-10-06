import { useNavigate } from 'react-router-dom';
import { useAsync, useLibraryVersion, useDownloadsReady, useSession } from '../lib/hooks.js';
import { loadAlbums } from '../lib/data.js';
import { Cover } from '../components/Cover.jsx';
import { BackBar, Loading, ErrorState, Empty, OfflineBanner } from '../components/Common.jsx';
import { IconAlbum } from '../components/Icons.jsx';
import { mediaUrl } from '../api/client.js';
import { coverFor } from '../lib/downloads.js';

export default function Albums() {
  const v = useLibraryVersion();
  const ready = useDownloadsReady();
  const session = useSession();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => (ready ? loadAlbums() : new Promise(() => {})), [v, ready, session.status]);

  return (
    <div className="page">
      <BackBar />
      <h1 className="page-title">Albums</h1>
      {loading && !data ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.albums.length ? (
        <Empty icon={<IconAlbum />} title="No albums yet" text="Albums are created from your songs' tags." />
      ) : (
        <>
          <OfflineBanner stale={data.stale} />
          <div className="grid-2">
            {data.albums.map((a) => (
              <div key={a._id} className="tile" onClick={() => navigate(`/albums/${a._id}`)}>
                <Cover src={a.cover ? mediaUrl(a.cover) : coverFor(a.sample)} seed={a.title} />
                <div className="t truncate" dir="auto">{a.title}</div>
                <div className="s truncate" dir="auto">{a.artist?.name} · {a.songCount}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
