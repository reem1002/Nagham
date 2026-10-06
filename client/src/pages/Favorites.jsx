import { useAsync, useLibraryVersion, useDownloadsReady, useFavoritesCount } from '../lib/hooks.js';
import { loadFavorites } from '../lib/data.js';
import { SongList } from '../components/SongRow.jsx';
import { CollectionActions } from '../components/CollectionActions.jsx';
import { BackBar, Loading, ErrorState, Empty, OfflineBanner } from '../components/Common.jsx';
import { IconHeart } from '../components/Icons.jsx';

export default function Favorites() {
  const v = useLibraryVersion();
  const ready = useDownloadsReady();
  const count = useFavoritesCount();
  const { data, loading, error, reload } = useAsync(() => (ready ? loadFavorites() : new Promise(() => {})), [v, ready, count]);
  return (
    <div className="page">
      <BackBar />
      <h1 className="page-title">Favorites</h1>
      {loading && !data ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.songs.length ? (
        <Empty icon={<IconHeart />} title="No favorites yet" text="Tap the heart on the player to save songs you love here." />
      ) : (
        <>
          <OfflineBanner stale={data.stale} />
          <CollectionActions songs={data.songs} />
          <div style={{ height: 14 }} />
          <SongList songs={data.songs} />
        </>
      )}
    </div>
  );
}
