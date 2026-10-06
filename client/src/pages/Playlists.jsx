import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAsync, useLibraryVersion, useDownloadsReady, useSession, notifyLibraryChanged } from '../lib/hooks.js';
import { loadPlaylists, createPlaylist } from '../lib/data.js';
import { PlaylistCover } from '../components/Cover.jsx';
import { BackBar, Loading, ErrorState, Empty, OfflineBanner } from '../components/Common.jsx';
import { Sheet } from '../components/Sheet.jsx';
import { IconPlus, IconList, IconChevron, IconPin } from '../components/Icons.jsx';
import { toast } from '../components/Toast.jsx';

export default function Playlists() {
  const v = useLibraryVersion();
  const ready = useDownloadsReady();
  const session = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const { data, loading, error, reload } = useAsync(() => (ready ? loadPlaylists() : new Promise(() => {})), [v, ready, session.status]);

  const create = async (e) => {
    e.preventDefault();
    try {
      const p = await createPlaylist(form.name.trim(), form.description.trim());
      setOpen(false);
      setForm({ name: '', description: '' });
      notifyLibraryChanged();
      navigate(`/playlists/${p._id}`);
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <div className="page">
      <BackBar right={<button className="icon-btn ringed accent" onClick={() => setOpen(true)} aria-label="New playlist"><IconPlus /></button>} />
      <h1 className="page-title">Playlists</h1>
      {loading && !data ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          <OfflineBanner stale={data.stale} />
          <button className="pl-row new" onClick={() => setOpen(true)}>
            <span className="pl-new-ico"><IconPlus size={26} /></span>
            <span className="meta"><span className="t">New playlist</span></span>
          </button>
          {!data.playlists.length ? (
            <Empty icon={<IconList />} title="No playlists yet" text="Group songs for running, studying, late nights… then download them for offline." />
          ) : (
            data.playlists.map((p) => (
              <button key={p._id} className="pl-row" onClick={() => navigate(`/playlists/${p._id}`)}>
                <PlaylistCover playlist={p} size={64} radius={12} />
                <span className="meta">
                  <span className="t truncate" dir="auto">{p.pinned && <IconPin size={14} style={{ color: 'var(--accent)', marginRight: 4, verticalAlign: -2 }} />}{p.name}</span>
                  {p.description && <span className="d truncate" dir="auto">{p.description}</span>}
                  <span className="s">{p.songCount} songs</span>
                </span>
                <IconChevron size={20} style={{ color: 'var(--text-3)' }} />
              </button>
            ))
          )}
        </>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="New playlist">
        <form onSubmit={create} style={{ padding: '0 4px 6px' }}>
          <div className="field"><label>Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus dir="auto" placeholder="e.g. صباح فيروز" /></div>
          <div className="field"><label>Description (optional)</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} dir="auto" /></div>
          <button className="btn btn-primary btn-block" disabled={!form.name.trim()}>Create playlist</button>
        </form>
      </Sheet>
    </div>
  );
}
