import { IconPlay, IconShuffle, IconDownload, IconCheckCircle } from './Icons.jsx';
import { playSongs, canPlay } from '../player/engine.js';
import { downloadSongs } from '../lib/downloads.js';
import { useDownloadItems, useSession, useOnline } from '../lib/hooks.js';
import { toast } from './Toast.jsx';

/** Play / Shuffle / Download-all row used on album, artist, playlist and favorites screens. */
export function CollectionActions({ songs, extra }) {
  const items = useDownloadItems();
  const session = useSession();
  const online = useOnline();
  const playable = songs.filter(canPlay);
  const remote = songs.filter((s) => !s.local);
  const done = remote.filter((s) => items[s._id]?.status === 'done').length;
  const busy = remote.filter((s) => ['queued', 'downloading'].includes(items[s._id]?.status)).length;
  const allDone = remote.length > 0 && done === remote.length;

  return (
    <div className="actions">
      <button className="btn btn-primary grow" disabled={!playable.length} onClick={() => playSongs(playable, 0, { shuffle: false })}>
        <IconPlay size={18} /> Play
      </button>
      <button className="btn btn-ghost grow" disabled={!playable.length} onClick={() => playSongs(playable, 0, { shuffle: true })}>
        <IconShuffle size={18} /> Shuffle
      </button>
      {session.status === 'account' && remote.length > 0 && (
        <button
          className={`icon-btn ringed ${allDone ? 'accent' : ''}`}
          aria-label={allDone ? 'All downloaded' : 'Download all'}
          title={allDone ? 'Downloaded' : 'Download all for offline'}
          disabled={!online && !allDone}
          onClick={() => {
            if (allDone) return toast('Everything here is on your device');
            const n = downloadSongs(remote);
            toast(n ? `Downloading ${n} songs for offline` : 'Already downloading');
          }}
          style={{ position: 'relative' }}
        >
          {allDone ? <IconCheckCircle /> : busy ? <span className="dl-count">{done}/{remote.length}</span> : <IconDownload />}
        </button>
      )}
      {extra}
    </div>
  );
}
