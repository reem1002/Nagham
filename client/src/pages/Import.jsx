import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSession, useOnline, notifyLibraryChanged } from '../lib/hooks.js';
import { isAudioFile, uploadFiles, importLocally, takeSharedFiles } from '../lib/importer.js';
import { IconImport, IconFolder, IconMusic, IconCheckCircle, IconPhone, IconCloud, IconChevron } from '../components/Icons.jsx';
import { fmtBytes } from '../lib/format.js';
import { playSongs } from '../player/engine.js';
import { toast } from '../components/Toast.jsx';
import { isNative } from '../lib/native.js';

const STATUS_LABEL = {
  waiting: 'Waiting',
  reading: 'Reading…',
  uploading: 'Uploading',
  done: 'Added',
  duplicate: 'Already in library',
  local: 'Saved on device',
  error: 'Failed',
};

export default function Import() {
  const session = useSession();
  const online = useOnline();
  const [params] = useSearchParams();
  const [items, setItems] = useState([]); // { file, status, progress, song, error }
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [artist, setArtist] = useState(params.get('artist') || '');
  const [album, setAlbum] = useState('');
  const [keep, setKeep] = useState(true);
  const fileRef = useRef(null);
  const folderRef = useRef(null);
  const account = session.status === 'account';

  const addFiles = useCallback((fileList) => {
    const files = [...fileList].filter(isAudioFile);
    const skipped = fileList.length - files.length;
    if (skipped) toast(`Skipped ${skipped} non-audio file${skipped > 1 ? 's' : ''}`);
    if (!files.length) return;
    setItems((prev) => [...prev, ...files.map((file) => ({ file, status: 'waiting', progress: 0 }))]);
  }, []);

  // Files arriving from Android's Share menu
  useEffect(() => {
    takeSharedFiles().then((files) => files.length && addFiles(files));
  }, [addFiles, params]);

  const patchItem = (index, patch) => setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const start = async () => {
    const pending = items.map((it, i) => ({ ...it, i })).filter((it) => it.status === 'waiting' || it.status === 'error');
    if (!pending.length) return;
    setRunning(true);
    const overrides = { artist: artist.trim(), album: album.trim() };
    try {
      if (account && online) {
        try {
          await uploadFiles(pending.map((p) => p.file), {
            overrides,
            keepOnDevice: keep,
            onFile: (k, patch) => patchItem(pending[k].i, patch),
          });
        } catch (e) {
          if (!e.offline) throw e;
          toast("Server unreachable — saving to this device instead");
          for (const p of pending) await saveLocal(p, overrides);
        }
      } else {
        for (const p of pending) await saveLocal(p, overrides);
      }
      notifyLibraryChanged();
    } catch (e) {
      toast(e.message || 'Import failed');
    } finally {
      setRunning(false);
    }
  };

  const saveLocal = async (p, overrides) => {
    patchItem(p.i, { status: 'reading' });
    try {
      const song = await importLocally(p.file, overrides);
      patchItem(p.i, { status: 'local', song });
    } catch (e) {
      patchItem(p.i, { status: 'error', error: e.message });
    }
  };

  const finished = items.filter((i) => ['done', 'duplicate', 'local'].includes(i.status));
  const waiting = items.filter((i) => i.status === 'waiting' || i.status === 'error').length;
  const totalSize = items.reduce((t, i) => t + i.file.size, 0);

  return (
    <div className="page">
      <h1 className="page-title">Import</h1>

      <div
        className={`drop ${over ? 'over' : ''}`}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <div className="ico"><IconImport size={28} /></div>
        <h3>Add your music</h3>
        <p>Pick audio files from your phone — MP3, M4A, FLAC, OGG, WAV. Title, artist, album and cover are read from the file.</p>
        <div className="btns">
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()}><IconMusic size={18} /> Choose files</button>
          {!isNative && <button className="btn btn-ghost" onClick={() => folderRef.current?.click()}><IconFolder size={18} /> Whole folder</button>}
        </div>
        <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.flac,.ogg,.opus,.wav,.aac" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ''))} />
        <input ref={folderRef} type="file" webkitdirectory="" directory="" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ''))} />
      </div>

      <div className="tip">
        <span className="ico">{account ? <IconCloud /> : <IconPhone />}</span>
        <div>
          <strong>{account ? 'Saved to your account' : 'Saved on this device'}</strong>
          {account
            ? 'Songs upload to your library so every device can see them, and stay downloaded here for offline listening.'
            : 'You’re using Nagham without an account, so songs stay on this phone only.'}
        </div>
      </div>

      {items.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">{items.length} file{items.length > 1 ? 's' : ''} · <span className="muted" style={{ fontFamily: 'var(--font-body)', fontSize: 14 }}>{fmtBytes(totalSize)}</span></h2>
            {!running && waiting > 0 && <button className="see-all" onClick={() => setItems((p) => p.filter((i) => i.status !== 'waiting'))}>Clear</button>}
          </div>

          {waiting > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="field">
                <label>Put all under artist (optional)</label>
                <input className="input" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Leave empty to use each file's tags — e.g. فيروز" dir="auto" />
              </div>
              <div className="field">
                <label>Album (optional)</label>
                <input className="input" value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="Leave empty to use the file's album" dir="auto" />
              </div>
              {account && (
                <div className="setting-row" style={{ paddingTop: 4 }}>
                  <div className="meta">
                    <div className="t">Keep on this device</div>
                    <div className="s">Available offline right away</div>
                  </div>
                  <button className={`toggle ${keep ? 'on' : ''}`} onClick={() => setKeep((k) => !k)} aria-pressed={keep} aria-label="Keep on this device" />
                </div>
              )}
              <button className="btn btn-primary btn-block" style={{ marginTop: 8 }} onClick={start} disabled={running}>
                {running ? 'Importing…' : `Import ${waiting} song${waiting > 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {finished.length > 0 && !running && (
            <div className="actions" style={{ marginTop: 0, marginBottom: 12 }}>
              <button className="btn btn-primary grow" onClick={() => playSongs(finished.map((i) => i.song).filter(Boolean), 0)}>Play imported</button>
              <Link className="btn btn-ghost grow" to="/songs">Open library <IconChevron size={16} /></Link>
            </div>
          )}

          {items.map((it, i) => (
            <div key={i} className="import-item">
              <span style={{ color: it.status === 'done' || it.status === 'local' ? 'var(--accent)' : 'var(--text-3)' }}>
                {it.status === 'done' || it.status === 'local' ? <IconCheckCircle /> : it.status === 'uploading' || it.status === 'reading' ? <span className="spinner" style={{ width: 20, height: 20 }} /> : <IconMusic />}
              </span>
              <div className="meta">
                <div className="t truncate" dir="auto">{it.song?.title || it.file.name}</div>
                <div className="s truncate" dir="auto">
                  {it.song ? `${it.song.artist?.name || ''}${it.song.album?.title ? ` · ${it.song.album.title}` : ''}` : fmtBytes(it.file.size)}
                  {it.error ? ` — ${it.error}` : ''}
                </div>
                {it.status === 'uploading' && <div className="progress-track" style={{ marginTop: 6, height: 4 }}><i style={{ width: `${(it.progress || 0) * 100}%` }} /></div>}
              </div>
              <span className={`status-pill ${['done', 'local'].includes(it.status) ? 'ok' : it.status === 'error' ? 'err' : ''}`}>{STATUS_LABEL[it.status]}</span>
            </div>
          ))}
        </section>
      )}

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: 8 }}>Faster ways to add songs</h2>
        <div className="tip">
          <span className="ico"><IconImport /></span>
          <div>
            <strong>Share straight into Nagham</strong>
            In WhatsApp, Telegram or Files, long-press an audio file → Share → Nagham. It lands on this screen ready to import.
          </div>
        </div>
        <div className="tip">
          <span className="ico"><IconMusic /></span>
          <div>
            <strong>Name files “Artist - Title”</strong>
            If a file has no tags, its name is used — “<bdi>فيروز - نسم علينا الهوى</bdi>.mp3” becomes artist <bdi>فيروز</bdi>, title <bdi>نسم علينا الهوى</bdi>.
          </div>
        </div>
      </section>
    </div>
  );
}
