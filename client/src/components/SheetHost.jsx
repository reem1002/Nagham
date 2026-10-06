import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetItem, useSheet, closeSheet, openSheet } from './Sheet.jsx';
import { SongCover, PlaylistCover } from './Cover.jsx';
import {
  IconNextUp, IconQueue, IconPlus, IconHeart, IconHeartFill, IconDownload, IconTrash, IconUser, IconAlbum, IconEdit, IconClose, IconMoon, IconCheckCircle,
} from './Icons.jsx';
import { playNext, addToQueue, refreshSongInQueue, setSleepTimer } from '../player/engine.js';
import { toggleFavorite } from '../lib/favorites.js';
import { downloadSong, removeDownload } from '../lib/downloads.js';
import { useDownloadState, useIsFavorite, useSession, notifyLibraryChanged, usePlayer } from '../lib/hooks.js';
import { loadPlaylists, addToPlaylist, createPlaylist, removeFromPlaylist, updateSong, deleteSong } from '../lib/data.js';
import { toast } from './Toast.jsx';
import { fmtBytes } from '../lib/format.js';

function SongSheet({ song, playlistId }) {
  const navigate = useNavigate();
  const fav = useIsFavorite(song._id);
  const dl = useDownloadState(song._id);
  const session = useSession();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const go = (path) => {
    closeSheet();
    navigate(path);
  };

  return (
    <>
      <div className="sheet-song">
        <SongCover song={song} size={56} radius={10} />
        <div style={{ minWidth: 0 }}>
          <div className="t truncate" dir="auto">{song.title}</div>
          <div className="s truncate" dir="auto">
            {song.artist?.name}
            {song.album?.title ? ` · ${song.album.title}` : ''}
          </div>
        </div>
      </div>
      <SheetItem icon={<IconNextUp />} onClick={() => (playNext(song), closeSheet())}>Play next</SheetItem>
      <SheetItem icon={<IconQueue />} onClick={() => (addToQueue(song), closeSheet())}>Add to queue</SheetItem>
      <SheetItem icon={<IconPlus />} onClick={() => openSheet('addToPlaylist', { songs: [song] })}>Add to playlist</SheetItem>
      <SheetItem icon={fav ? <IconHeartFill style={{ color: 'var(--accent)' }} /> : <IconHeart />} onClick={() => toggleFavorite(song).then((on) => toast(on ? 'Added to Favorites' : 'Removed from Favorites'))}>
        {fav ? 'Remove from Favorites' : 'Add to Favorites'}
      </SheetItem>
      {song.local ? (
        <SheetItem icon={<IconCheckCircle style={{ color: 'var(--accent)' }} />} disabled>Stored on this device</SheetItem>
      ) : dl?.status === 'done' ? (
        <SheetItem icon={<IconCheckCircle style={{ color: 'var(--accent)' }} />} onClick={() => removeDownload(song._id).then(() => toast('Removed from device'))} right={<span className="faint" style={{ fontSize: 12 }}>{fmtBytes(dl.size)}</span>}>
          Remove download
        </SheetItem>
      ) : dl?.status === 'downloading' || dl?.status === 'queued' ? (
        <SheetItem icon={<IconDownload />} onClick={() => removeDownload(song._id)} right={<span className="faint" style={{ fontSize: 12 }}>{Math.round((dl.progress || 0) * 100)}%</span>}>
          Downloading… tap to cancel
        </SheetItem>
      ) : (
        <SheetItem icon={<IconDownload />} disabled={session.status !== 'account'} onClick={() => (downloadSong(song), toast('Downloading for offline'))}>
          Download to device
        </SheetItem>
      )}
      {song.artist?._id && <SheetItem icon={<IconUser />} onClick={() => go(`/artists/${song.artist._id}`)}>Go to artist</SheetItem>}
      {song.album?._id && <SheetItem icon={<IconAlbum />} onClick={() => go(`/albums/${song.album._id}`)}>Go to album</SheetItem>}
      <SheetItem icon={<IconEdit />} onClick={() => openSheet('editSong', { song })}>Edit info & lyrics</SheetItem>
      {playlistId && (
        <SheetItem
          icon={<IconClose />}
          onClick={async () => {
            await removeFromPlaylist(playlistId, song._id);
            notifyLibraryChanged();
            closeSheet();
            toast('Removed from playlist');
          }}
        >
          Remove from this playlist
        </SheetItem>
      )}
      <SheetItem
        icon={<IconTrash />}
        danger
        onClick={async () => {
          if (!confirmDelete) return setConfirmDelete(true);
          try {
            await deleteSong(song);
            notifyLibraryChanged();
            closeSheet();
            toast('Deleted from library');
          } catch (e) {
            toast(e.message);
          }
        }}
      >
        {confirmDelete ? 'Tap again to delete permanently' : 'Delete from library'}
      </SheetItem>
    </>
  );
}

function AddToPlaylistSheet({ songs }) {
  const [lists, setLists] = useState(null);
  const [name, setName] = useState('');
  useEffect(() => {
    loadPlaylists().then((r) => setLists(r.playlists)).catch(() => setLists([]));
  }, []);
  const ids = songs.map((s) => s._id);
  const add = async (p) => {
    try {
      await addToPlaylist(p._id, ids);
      notifyLibraryChanged();
      closeSheet();
      toast(`Added to ${p.name}`);
    } catch (e) {
      toast(e.message);
    }
  };
  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const p = await createPlaylist(name.trim(), '', ids);
      notifyLibraryChanged();
      closeSheet();
      toast(`Created “${p.name}”`);
    } catch (err) {
      toast(err.message);
    }
  };
  return (
    <>
      <form className="new-pl" onSubmit={create}>
        <input className="input" placeholder="New playlist name" value={name} onChange={(e) => setName(e.target.value)} dir="auto" />
        <button className="btn btn-primary" type="submit" disabled={!name.trim()}>Create</button>
      </form>
      {!lists ? (
        <div className="center-spin"><div className="spinner" /></div>
      ) : (
        lists.map((p) => (
          <button key={p._id} className="pl-pick" onClick={() => add(p)}>
            <PlaylistCover playlist={p} size={44} radius={8} />
            <span className="truncate" dir="auto">{p.name}</span>
            <span className="faint">{p.songCount}</span>
          </button>
        ))
      )}
    </>
  );
}

function EditSongSheet({ song }) {
  const [form, setForm] = useState({
    title: song.title || '',
    artist: song.artist?.name || '',
    album: song.album?.title || '',
    genre: song.genre || '',
    lyrics: song.lyrics || '',
  });
  const [saving, setSaving] = useState(false);
  const bind = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }), dir: 'auto' });
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateSong(song, form);
      if (updated) refreshSongInQueue(updated);
      notifyLibraryChanged();
      closeSheet();
      toast('Saved');
    } catch (err) {
      toast(err.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={save} style={{ padding: '4px 4px 8px' }}>
      <div className="field"><label>Title</label><input className="input" {...bind('title')} required /></div>
      <div className="field"><label>Artist</label><input className="input" {...bind('artist')} placeholder="e.g. فيروز" /></div>
      <div className="field"><label>Album</label><input className="input" {...bind('album')} /></div>
      <div className="field"><label>Genre</label><input className="input" {...bind('genre')} /></div>
      <div className="field"><label>Lyrics</label><textarea className="input" {...bind('lyrics')} rows={6} placeholder="Paste the lyrics here — they show on the Now Playing screen" /></div>
      <button className="btn btn-primary btn-block" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
    </form>
  );
}

function SleepSheet() {
  const sleepAt = usePlayer((s) => s.sleepAt);
  const opts = [
    [15, '15 minutes'],
    [30, '30 minutes'],
    [45, '45 minutes'],
    [60, '1 hour'],
    ['end', 'End of this song'],
  ];
  return (
    <>
      {opts.map(([v, label]) => (
        <SheetItem key={v} icon={<IconMoon />} onClick={() => (setSleepTimer(v), closeSheet(), toast(`Sleep timer: ${label}`))}>
          {label}
        </SheetItem>
      ))}
      {sleepAt && (
        <SheetItem icon={<IconClose />} danger onClick={() => (setSleepTimer(null), closeSheet(), toast('Sleep timer off'))}>
          Turn off timer
        </SheetItem>
      )}
    </>
  );
}

const TITLES = { addToPlaylist: 'Add to playlist', editSong: 'Edit song', sleep: 'Sleep timer' };

export function SheetHost() {
  const sheet = useSheet();
  if (!sheet) return null;
  const { type, props } = sheet;
  return (
    <Sheet open onClose={closeSheet} title={TITLES[type]} tall={type === 'editSong'}>
      {type === 'song' && <SongSheet {...props} />}
      {type === 'addToPlaylist' && <AddToPlaylistSheet {...props} />}
      {type === 'editSong' && <EditSongSheet {...props} />}
      {type === 'sleep' && <SleepSheet />}
    </Sheet>
  );
}
