import { useAsync } from '../lib/hooks.js';
import { loadStats } from '../lib/data.js';
import { BackBar, Loading, ErrorState, OfflineBanner } from '../components/Common.jsx';
import { SongCover } from '../components/Cover.jsx';
import { playSong } from '../player/engine.js';

export default function Stats() {
  const { data, loading, error, reload } = useAsync(() => loadStats(), []);
  if (loading && !data) return <div className="page"><BackBar /><Loading /></div>;
  if (error) return <div className="page"><BackBar /><ErrorState error={error} onRetry={reload} /></div>;
  const s = data.data;
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push(s.daily.find((x) => x.day === d)?.minutes || 0);
  }
  const max = Math.max(1, ...days);
  const top = s.topSongs.map((t) => t.song);

  return (
    <div className="page">
      <BackBar />
      <h1 className="page-title">Your listening</h1>
      <OfflineBanner stale={data.stale} />
      <div className="stat-row">
        <div className="stat"><div className="v">{s.minutesLast30Days}</div><div className="l">minutes · 30 days</div></div>
        <div className="stat"><div className="v">{s.playsLast30Days}</div><div className="l">plays · 30 days</div></div>
        <div className="stat"><div className="v">{s.librarySongs}</div><div className="l">songs in library</div></div>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 600 }}>Minutes per day</div>
        <div className="bars" role="img" aria-label="Listening minutes over the last 30 days">
          {days.map((m, i) => <i key={i} style={{ height: `${(m / max) * 100}%`, opacity: m ? 0.9 : 0.15 }} title={`${m} min`} />)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}><span>30 days ago</span><span>Today</span></div>
      </div>
      {s.topSongs.length > 0 && (
        <section className="section">
          <h2 className="section-title" style={{ marginBottom: 8 }}>Top songs</h2>
          {s.topSongs.map(({ song, plays }, i) => (
            <div key={song._id} className="song-row" onClick={() => playSong(song, top)}>
              <span className="num">{i + 1}</span>
              <SongCover song={song} size={44} radius={8} />
              <div className="meta"><div className="title truncate" dir="auto">{song.title}</div><div className="sub truncate" dir="auto">{song.artist?.name}</div></div>
              <span className="dur">{plays} plays</span>
            </div>
          ))}
        </section>
      )}
      {s.topArtists.length > 0 && (
        <section className="section">
          <h2 className="section-title" style={{ marginBottom: 8 }}>Top artists</h2>
          {s.topArtists.map(({ artist, plays }) => (
            <div key={artist._id} className="setting-row"><div className="meta"><div className="t" dir="auto">{artist.name}</div></div><span className="faint">{plays} plays</span></div>
          ))}
        </section>
      )}
    </div>
  );
}
