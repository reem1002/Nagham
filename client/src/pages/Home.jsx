import { Link, useNavigate } from 'react-router-dom';
import { useAsync, useLibraryVersion, useSession, useDownloadsReady } from '../lib/hooks.js';
import { loadHome } from '../lib/data.js';
import { Cover, SongCover, PlaylistCover } from '../components/Cover.jsx';
import { SongList } from '../components/SongRow.jsx';
import { OfflineBanner, Loading, ErrorState, Empty } from '../components/Common.jsx';
import { IconSearch, IconChevron, IconStats, IconImport, IconPin, IconPlay } from '../components/Icons.jsx';
import { playSong, playSongs, canPlay } from '../player/engine.js';
import { mediaUrl } from '../api/client.js';
import { coverFor } from '../lib/downloads.js';
import { fmtDuration, plural } from '../lib/format.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const v = useLibraryVersion();
  const ready = useDownloadsReady();
  const session = useSession();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => (ready ? loadHome() : new Promise(() => {})), [v, ready, session.status]);
  const name = session.user?.name?.split(' ')[0];

  return (
    <div className="page">
      <div className="topbar">
        <div className="avatar">{(name || 'N')[0].toUpperCase()}</div>
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontWeight: 600 }} dir="auto">{greeting()}{name && session.status === 'account' ? `, ${name}` : ''}</div>
          <div className="faint" style={{ fontSize: 13 }}>What will you listen to today?</div>
        </div>
        <div className="spacer" />
        {session.status === 'account' && (
          <Link to="/stats" className="icon-btn ringed" aria-label="Listening stats"><IconStats size={20} /></Link>
        )}
      </div>

      <button className="search-box" style={{ width: '100%', margin: '10px 0 4px' }} onClick={() => navigate('/search')}>
        <IconSearch size={20} />
        <span style={{ color: 'var(--text-3)' }}>Search songs, artists, albums…</span>
      </button>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <HomeContent data={data} />
      )}
    </div>
  );
}

function HomeContent({ data }) {
  const navigate = useNavigate();
  const { recent, added, mostPlayed, playlists, artists, totals, stale } = data;

  if (!totals.songs) {
    return (
      <>
        <div style={{ height: 20 }} />
        <OfflineBanner stale={stale} />
        <Empty icon={<IconImport />} title="Your library is empty" text="Add songs from your phone — Fairuz, anything you own. They'll play offline and with the screen locked.">
          <Link to="/import" className="btn btn-primary">Import music</Link>
        </Empty>
      </>
    );
  }

  const continueList = recent.filter(Boolean).slice(0, 6);

  return (
    <>
      <div style={{ height: 14 }} />
      <OfflineBanner stale={stale} />

      <div className="summary">
        <span><strong>{totals.songs}</strong> songs</span>
        <span>·</span>
        <span>{fmtDuration(totals.minutes * 60)}</span>
        <div className="spacer" />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => playSongs(added.filter(canPlay).length ? added.filter(canPlay) : added, 0, { shuffle: true })}
        >
          <IconPlay size={16} /> Shuffle all
        </button>
      </div>

      {continueList.length > 0 && (
        <section className="section">
          <div className="section-head"><h2 className="section-title">Continue listening</h2></div>
          <div className="quick-grid">
            {continueList.map((s) => (
              <div key={s._id} className="quick-card" onClick={() => canPlay(s) && playSong(s, continueList.filter(canPlay))} style={{ opacity: canPlay(s) ? 1 : 0.4 }}>
                <SongCover song={s} size={56} radius={0} />
                <div className="t" dir="auto">{s.title}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {playlists.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title"><IconPin size={18} /> Playlists</h2>
            <Link to="/playlists" className="see-all">See all <IconChevron size={16} /></Link>
          </div>
          <div className="shelf">
            {playlists.map((p) => (
              <div key={p._id} className="pin-tile" onClick={() => navigate(`/playlists/${p._id}`)}>
                <PlaylistCover playlist={p} radius={0} />
                <div className="cap truncate" dir="auto">{p.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Recently added</h2>
          <Link to="/songs" className="see-all">See all <IconChevron size={16} /></Link>
        </div>
        <div className="shelf">
          {added.map((s) => (
            <div key={s._id} className="tile" onClick={() => canPlay(s) && playSong(s, added.filter(canPlay))} style={{ opacity: canPlay(s) ? 1 : 0.4 }}>
              <SongCover song={s} />
              <div className="t truncate" dir="auto">{s.title}</div>
              <div className="s truncate" dir="auto">{s.artist?.name}</div>
            </div>
          ))}
        </div>
      </section>

      {artists.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Your artists</h2>
            <Link to="/artists" className="see-all">See all <IconChevron size={16} /></Link>
          </div>
          <div className="shelf">
            {artists.map((a) => (
              <div key={a._id} className="tile round" onClick={() => navigate(`/artists/${a._id}`)}>
                <Cover src={a.image ? mediaUrl(a.image) : coverFor(a.sample)} seed={a.name} round />
                <div className="t truncate" dir="auto">{a.name}</div>
                <div className="s">{plural(a.songCount, 'song')}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {mostPlayed.length > 0 && (
        <section className="section">
          <div className="section-head"><h2 className="section-title">On repeat</h2></div>
          <SongList songs={mostPlayed.slice(0, 5)} />
        </section>
      )}
    </>
  );
}
