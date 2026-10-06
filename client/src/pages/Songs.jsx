import { useMemo, useState } from 'react';
import { useAsync, useLibraryVersion, useDownloadsReady, useDownloadItems, useSession } from '../lib/hooks.js';
import { loadSongs } from '../lib/data.js';
import { SongList } from '../components/SongRow.jsx';
import { BackBar, Loading, ErrorState, Empty, OfflineBanner } from '../components/Common.jsx';
import { CollectionActions } from '../components/CollectionActions.jsx';
import { IconMusic } from '../components/Icons.jsx';
import { Link } from 'react-router-dom';
import { fmtDuration, plural } from '../lib/format.js';

const SORTS = [
  ['recent', 'Recently added'],
  ['title', 'A–Z'],
  ['artist', 'Artist'],
  ['plays', 'Most played'],
  ['offline', 'Downloaded'],
];

export default function Songs() {
  const v = useLibraryVersion();
  const ready = useDownloadsReady();
  const session = useSession();
  const items = useDownloadItems();
  const [sort, setSort] = useState('recent');
  const { data, loading, error, reload } = useAsync(() => (ready ? loadSongs() : new Promise(() => {})), [v, ready, session.status]);

  const songs = useMemo(() => {
    if (!data) return [];
    const list = [...data.songs];
    const cmp = (a, b) => (a || '').localeCompare(b || '', ['ar', 'en']);
    if (sort === 'title') list.sort((a, b) => cmp(a.title, b.title));
    if (sort === 'artist') list.sort((a, b) => cmp(a.artist?.name, b.artist?.name) || cmp(a.title, b.title));
    if (sort === 'plays') list.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    if (sort === 'offline') return list.filter((s) => items[s._id]?.status === 'done');
    return list;
  }, [data, sort, items]);

  return (
    <div className="page">
      <BackBar />
      <h1 className="page-title">Songs</h1>
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data.songs.length ? (
        <Empty icon={<IconMusic />} title="No songs yet" text="Import audio files from your phone to start your library.">
          <Link to="/import" className="btn btn-primary">Import music</Link>
        </Empty>
      ) : (
        <>
          <OfflineBanner stale={data.stale} />
          <p className="faint" style={{ margin: '-8px 0 14px', fontSize: 13 }}>
            {plural(data.songs.length, 'song')} · {fmtDuration(data.songs.reduce((t, s) => t + (s.duration || 0), 0))}
          </p>
          <CollectionActions songs={songs} />
          <div className="chip-row" style={{ margin: '16px calc(-1 * var(--gutter)) 10px' }}>
            {SORTS.map(([k, label]) => (
              <button key={k} className={`chip ${sort === k ? 'active' : ''}`} onClick={() => setSort(k)}>{label}</button>
            ))}
          </div>
          {songs.length ? <SongList songs={songs} /> : <p className="faint">Nothing downloaded yet.</p>}
        </>
      )}
    </div>
  );
}
