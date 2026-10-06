import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAsync, useLibraryVersion, useDownloadsReady, notifyLibraryChanged } from '../lib/hooks.js';
import { loadPlaylist, updatePlaylist, deletePlaylist } from '../lib/data.js';
import { PlaylistCover } from '../components/Cover.jsx';
import { SongList } from '../components/SongRow.jsx';
import { CollectionActions } from '../components/CollectionActions.jsx';
import { BackBar, Loading, ErrorState, OfflineBanner, Empty } from '../components/Common.jsx';
import { Sheet, SheetItem } from '../components/Sheet.jsx';
import { IconMore, IconEdit, IconTrash, IconPin, IconMusic, IconQueue } from '../components/Icons.jsx';
import { addToQueue } from '../player/engine.js';
import { toast } from '../components/Toast.jsx';
import { fmtDuration, plural } from '../lib/format.js';
import { coverFor } from '../lib/downloads.js';

export default function PlaylistDetail() {
  const { id } = useParams();
  const v = useLibraryVersion();
  const ready = useDownloadsReady();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [edit, setEdit] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const { data, loading, error, reload } = useAsync(() => (ready ? loadPlaylist(id) : new Promise(() => {})), [id, v, ready]);

  if (loading && !data) return <div className="page"><BackBar /><Loading /></div>;
  if (error) return <div className="page"><BackBar /><ErrorState error={error} onRetry={reload} /></div>;
  const { playlist, stale } = data;
  const art = coverFor(playlist.songs[0]);

  const save = async (e) => {
    e.preventDefault();
    try {
      await updatePlaylist(id, { name: edit.name, description: edit.description });
      setEdit(null);
      notifyLibraryChanged();
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <div className="page">
      <div className="hero">
        {art && <div className="hero-bg" style={{ backgroundImage: `url("${art}")` }} />}
        <BackBar right={<button className="icon-btn" onClick={() => setMenu(true)} aria-label="Playlist options"><IconMore /></button>} />
        <PlaylistCover playlist={{ ...playlist, coverSongs: playlist.songs.slice(0, 4) }} className="hero-cover" radius={20} />
        <h1 dir="auto">{playlist.name}</h1>
        {playlist.description && <div className="meta-line" dir="auto" style={{ marginBottom: 2 }}>{playlist.description}</div>}
        <div className="meta-line">{plural(playlist.songs.length, 'song')} · {fmtDuration(playlist.duration)}</div>
        {playlist.songs.length > 0 && <CollectionActions songs={playlist.songs} />}
      </div>
      <OfflineBanner stale={stale} />
      {playlist.songs.length ? (
        <SongList songs={playlist.songs} playlistId={id} />
      ) : (
        <Empty icon={<IconMusic />} title="This playlist is empty" text="Open any song's menu (⋯) and choose “Add to playlist”." >
          <button className="btn btn-ghost" onClick={() => navigate('/songs')}>Browse songs</button>
        </Empty>
      )}

      <Sheet open={menu} onClose={() => (setMenu(false), setConfirm(false))}>
        <SheetItem icon={<IconQueue />} onClick={() => (addToQueue(playlist.songs), setMenu(false))} disabled={!playlist.songs.length}>Add all to queue</SheetItem>
        <SheetItem icon={<IconEdit />} onClick={() => (setMenu(false), setEdit({ name: playlist.name, description: playlist.description || '' }))}>Rename</SheetItem>
        <SheetItem icon={<IconPin />} onClick={async () => { await updatePlaylist(id, { pinned: !playlist.pinned }); setMenu(false); notifyLibraryChanged(); }}>
          {playlist.pinned ? 'Unpin' : 'Pin to top'}
        </SheetItem>
        <SheetItem
          icon={<IconTrash />}
          danger
          onClick={async () => {
            if (!confirm) return setConfirm(true);
            await deletePlaylist(id);
            notifyLibraryChanged();
            toast('Playlist deleted');
            navigate('/playlists', { replace: true });
          }}
        >
          {confirm ? 'Tap again to delete' : 'Delete playlist'}
        </SheetItem>
      </Sheet>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title="Edit playlist">
        {edit && (
          <form onSubmit={save} style={{ padding: '0 4px 6px' }}>
            <div className="field"><label>Name</label><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required dir="auto" /></div>
            <div className="field"><label>Description</label><input className="input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} dir="auto" /></div>
            <button className="btn btn-primary btn-block">Save</button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
