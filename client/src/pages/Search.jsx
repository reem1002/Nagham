import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { search, loadArtists } from '../lib/data.js';
import { SongList } from '../components/SongRow.jsx';
import { Cover, PlaylistCover } from '../components/Cover.jsx';
import { IconSearch, IconClose } from '../components/Icons.jsx';
import { Loading, Empty, OfflineBanner } from '../components/Common.jsx';
import { mediaUrl } from '../api/client.js';
import { coverFor } from '../lib/downloads.js';
import { gradientFor } from '../lib/format.js';
import { useLibraryVersion } from '../lib/hooks.js';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [artists, setArtists] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const v = useLibraryVersion();

  useEffect(() => {
    loadArtists().then((r) => setArtists(r.artists.filter((a) => a.songCount > 0).slice(0, 8))).catch(() => {});
  }, [v]);

  useEffect(() => {
    const term = q.trim();
    setParams(term ? { q: term } : {}, { replace: true });
    if (!term) {
      setRes(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      search(term)
        .then(setRes)
        .catch(() => setRes({ songs: [], artists: [], albums: [], playlists: [] }))
        .finally(() => setLoading(false));
    }, 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, v]);

  const nothing = res && !res.songs.length && !res.artists.length && !res.albums.length && !res.playlists.length;

  return (
    <div className="page">
      <h1 className="page-title">Search</h1>
      <label className="search-box">
        <IconSearch size={20} />
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Songs, artists, albums, lyrics…" dir="auto" autoFocus enterKeyHint="search" />
        {q && (
          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => (setQ(''), inputRef.current?.focus())} aria-label="Clear">
            <IconClose size={18} />
          </button>
        )}
      </label>

      {!q.trim() && (
        <section className="section">
          <h2 className="section-title" style={{ marginBottom: 14 }}>Browse your artists</h2>
          {artists.length ? (
            <div className="genre-grid">
              {artists.map((a) => (
                <button key={a._id} className="genre-card" style={{ background: gradientFor(a.name) }} onClick={() => navigate(`/artists/${a._id}`)}>
                  <span dir="auto">{a.name}</span>
                  <Cover src={a.image ? mediaUrl(a.image) : coverFor(a.sample)} seed={a.name} className="genre-art" radius={8} />
                </button>
              ))}
            </div>
          ) : (
            <p className="faint">Import some music and your artists will show up here.</p>
          )}
        </section>
      )}

      {q.trim() && (loading && !res ? <Loading /> : res && (
        <div style={{ marginTop: 18 }}>
          <OfflineBanner stale={res.stale} />
          {nothing && <Empty title="No matches" text={`Nothing in your library matches “${q}”. Try another spelling — Arabic and English both work.`} />}
          {res.artists.length > 0 && (
            <section className="section" style={{ marginTop: 6 }}>
              <h2 className="section-title" style={{ marginBottom: 12 }}>Artists</h2>
              <div className="shelf">
                {res.artists.map((a) => (
                  <div key={a._id} className="tile round" onClick={() => navigate(`/artists/${a._id}`)}>
                    <Cover src={a.image ? mediaUrl(a.image) : coverFor(a.sample)} seed={a.name} round />
                    <div className="t truncate" dir="auto">{a.name}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {res.songs.length > 0 && (
            <section className="section">
              <h2 className="section-title" style={{ marginBottom: 8 }}>Songs</h2>
              <SongList songs={res.songs} />
            </section>
          )}
          {res.albums.length > 0 && (
            <section className="section">
              <h2 className="section-title" style={{ marginBottom: 12 }}>Albums</h2>
              <div className="shelf">
                {res.albums.map((a) => (
                  <div key={a._id} className="tile" onClick={() => navigate(`/albums/${a._id}`)}>
                    <Cover src={a.cover ? mediaUrl(a.cover) : coverFor(a.sample)} seed={a.title} />
                    <div className="t truncate" dir="auto">{a.title}</div>
                    <div className="s truncate" dir="auto">{a.artist?.name}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {res.playlists.length > 0 && (
            <section className="section">
              <h2 className="section-title" style={{ marginBottom: 12 }}>Playlists</h2>
              <div className="shelf">
                {res.playlists.map((p) => (
                  <div key={p._id} className="tile" onClick={() => navigate(`/playlists/${p._id}`)}>
                    <PlaylistCover playlist={p} />
                    <div className="t truncate" dir="auto">{p.name}</div>
                    <div className="s">{p.songCount} songs</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ))}
    </div>
  );
}
