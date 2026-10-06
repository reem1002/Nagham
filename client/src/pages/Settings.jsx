import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession, useOnline, useDownloadItems, notifyLibraryChanged, usePlayer } from '../lib/hooks.js';
import { signOut, serverLabel } from '../lib/session.js';
import { getServerUrl, setServerUrl, api, isNative } from '../api/client.js';
import { getAllOfflineRecords, deleteLocalSong, storeDownloadFromFile, storageEstimate } from '../lib/downloads.js';
import { uploadFiles } from '../lib/importer.js';
import { openSheet } from '../components/Sheet.jsx';
import { toast } from '../components/Toast.jsx';
import { fmtBytes } from '../lib/format.js';
import { IconChevron, IconCloud, IconDownload, IconMoon, IconStats, IconUser } from '../components/Icons.jsx';

export default function Settings() {
  const session = useSession();
  const online = useOnline();
  const items = useDownloadItems();
  const sleepAt = usePlayer((s) => s.sleepAt);
  const [server, setServer] = useState(getServerUrl());
  const [status, setStatus] = useState(null);
  const [est, setEst] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const localCount = Object.values(items).filter((i) => i.local).length;

  useEffect(() => {
    storageEstimate().then(setEst);
  }, [items]);

  const test = async () => {
    setServerUrl(server);
    setStatus('checking');
    try {
      await api('/health');
      setStatus('ok');
    } catch {
      setStatus('fail');
    }
  };

  // Move device-only songs into the account so they show up everywhere
  const syncLocal = async () => {
    setSyncing(true);
    try {
      const recs = (await getAllOfflineRecords()).filter((r) => r.local);
      let n = 0;
      await uploadFiles(
        recs.map((r) => new File([r.audio], r.song.file?.originalName || `${r.song.title}.mp3`, { type: r.audio.type || 'audio/mpeg' })),
        {
          keepOnDevice: false,
          onFile: async (i, patch) => {
            if ((patch.status === 'done' || patch.status === 'duplicate') && patch.song) {
              await storeDownloadFromFile(patch.song, recs[i].audio);
              await deleteLocalSong(recs[i].id);
              n++;
            }
          },
        }
      );
      notifyLibraryChanged();
      toast(`Uploaded ${n} songs to your account`);
    } catch (e) {
      toast(e.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>

      <div className="card">
        <div className="setting-row" style={{ paddingTop: 0 }}>
          <div className="avatar"><IconUser size={20} /></div>
          <div className="meta">
            <div className="t" dir="auto">{session.user?.name || 'Guest'}</div>
            <div className="s">{session.status === 'account' ? session.user?.email : 'Device-only mode — no account'}</div>
          </div>
        </div>
        {session.status === 'account' ? (
          <button className="btn btn-ghost btn-block" onClick={signOut}>Sign out</button>
        ) : (
          <button className="btn btn-primary btn-block" onClick={signOut}>Sign in or create account</button>
        )}
      </div>

      {session.status === 'account' && localCount > 0 && (
        <div className="tip">
          <span className="ico"><IconCloud /></span>
          <div style={{ flex: 1 }}>
            <strong>{localCount} songs are only on this device</strong>
            Upload them to your account so they're backed up and show up on your other devices.
            <button className="btn btn-primary btn-sm" style={{ marginTop: 10, display: 'flex' }} disabled={!online || syncing} onClick={syncLocal}>
              {syncing ? 'Uploading…' : 'Upload to my account'}
            </button>
          </div>
        </div>
      )}

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: 6 }}>Listening</h2>
        <div className="list">
          {session.status === 'account' && (
            <Link to="/stats" className="setting-row">
              <span className="ico" style={{ color: 'var(--accent)' }}><IconStats /></span>
              <div className="meta"><div className="t">Listening stats</div><div className="s">Your top songs and minutes this month</div></div>
              <IconChevron size={18} style={{ color: 'var(--text-3)' }} />
            </Link>
          )}
          <button className="setting-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => openSheet('sleep')}>
            <span className="ico" style={{ color: 'var(--accent)' }}><IconMoon /></span>
            <div className="meta"><div className="t">Sleep timer</div><div className="s">{sleepAt ? (sleepAt === 'end' ? 'Stops after this song' : `Stops at ${new Date(sleepAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`) : 'Off'}</div></div>
            <IconChevron size={18} style={{ color: 'var(--text-3)' }} />
          </button>
          <Link to="/downloads" className="setting-row">
            <span className="ico" style={{ color: 'var(--accent)' }}><IconDownload /></span>
            <div className="meta"><div className="t">Storage</div><div className="s">{est ? `${est.count} songs · ${fmtBytes(est.used)} on this device` : '…'}</div></div>
            <IconChevron size={18} style={{ color: 'var(--text-3)' }} />
          </Link>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: 6 }}>Server</h2>
        <p className="muted" style={{ fontSize: 13, margin: '0 0 12px' }}>
          {isNative
            ? 'The address of your Nagham API, e.g. https://nagham-api.onrender.com or http://192.168.1.5:5000 on home Wi-Fi.'
            : `Leave empty to use this website (${window.location.origin}).`}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" value={server} onChange={(e) => (setServer(e.target.value), setStatus(null))} placeholder={serverLabel()} inputMode="url" />
          <button className="btn btn-ghost" style={{ height: 50 }} onClick={test}>Save & test</button>
        </div>
        {status && (
          <p style={{ fontSize: 13, marginTop: 8, color: status === 'ok' ? 'var(--accent)' : status === 'fail' ? 'var(--danger)' : 'var(--text-2)' }}>
            {status === 'ok' ? '✓ Connected' : status === 'fail' ? "✗ Can't reach the server at that address" : 'Checking…'}
          </p>
        )}
      </section>

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: 6 }}>About</h2>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
          Nagham plays music files you own. Songs you download are stored inside the app and play with no connection; playback continues with the screen locked, with controls on the lock screen and notification.
        </p>
        <p className="faint" style={{ fontSize: 12 }}>Version 1.0.0 · {online ? 'Online' : 'Offline'}</p>
      </section>
    </div>
  );
}
