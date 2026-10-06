import { useEffect, useState } from 'react';
import { useAsync, useLibraryVersion, useDownloadsReady, useDownloadItems } from '../lib/hooks.js';
import { loadDownloads } from '../lib/data.js';
import { storageEstimate, removeDownload } from '../lib/downloads.js';
import { SongList } from '../components/SongRow.jsx';
import { CollectionActions } from '../components/CollectionActions.jsx';
import { BackBar, Loading, Empty } from '../components/Common.jsx';
import { IconDownload, IconTrash } from '../components/Icons.jsx';
import { fmtBytes } from '../lib/format.js';
import { toast } from '../components/Toast.jsx';

export default function Downloads() {
  const v = useLibraryVersion();
  const ready = useDownloadsReady();
  const items = useDownloadItems();
  const doneCount = Object.values(items).filter((i) => i.status === 'done').length;
  const active = Object.values(items).filter((i) => ['queued', 'downloading'].includes(i.status)).length;
  const { data, loading } = useAsync(() => (ready ? loadDownloads() : new Promise(() => {})), [v, ready, doneCount]);
  const [est, setEst] = useState(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    storageEstimate().then(setEst);
  }, [doneCount]);

  const removeAll = async () => {
    if (!confirm) return setConfirm(true);
    const ids = (data || []).filter((s) => !s.local).map((s) => s._id);
    for (const id of ids) await removeDownload(id);
    setConfirm(false);
    toast(`Removed ${ids.length} downloads`);
  };

  return (
    <div className="page">
      <BackBar />
      <h1 className="page-title">On this device</h1>
      {est && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
            <span><strong>{est.count}</strong> <span className="muted">songs · {fmtBytes(est.used)}</span></span>
            {est.quota > 0 && <span className="faint">{fmtBytes(est.quota)} available</span>}
          </div>
          <div className="progress-track"><i style={{ width: `${est.quota ? Math.max(1.5, (est.used / est.quota) * 100) : 0}%` }} /></div>
          {active > 0 && <p className="muted" style={{ margin: '10px 0 0', fontSize: 13 }}>Downloading {active} song{active > 1 ? 's' : ''}…</p>}
        </div>
      )}
      {loading && !data ? <Loading /> : !data?.length ? (
        <Empty icon={<IconDownload />} title="Nothing on this device yet" text="Open an album, artist or playlist and tap the download button. Those songs will play with no internet." />
      ) : (
        <>
          <CollectionActions
            songs={data}
            extra={data.some((s) => !s.local) && (
              <button className={`icon-btn ringed`} onClick={removeAll} aria-label="Remove all downloads" title="Remove all downloads" style={confirm ? { color: 'var(--danger)', borderColor: 'var(--danger)' } : undefined}>
                <IconTrash size={20} />
              </button>
            )}
          />
          {confirm && <p className="error-text" style={{ marginTop: 10 }}>Tap the bin again to remove all downloads (imported device-only songs are kept).</p>}
          <div style={{ height: 14 }} />
          <SongList songs={data} />
        </>
      )}
    </div>
  );
}
