import { Link } from 'react-router-dom';
import { useAsync, useLibraryVersion, useDownloadsReady, useFavoritesCount, useDownloadItems } from '../lib/hooks.js';
import { loadHome } from '../lib/data.js';
import { IconMusic, IconUser, IconAlbum, IconList, IconHeart, IconDownload, IconChevron, IconSearch } from '../components/Icons.jsx';
import { SongList } from '../components/SongRow.jsx';

export default function Library() {
  const v = useLibraryVersion();
  const ready = useDownloadsReady();
  const favCount = useFavoritesCount();
  const dlCount = Object.values(useDownloadItems()).filter((d) => d.status === 'done').length;
  const { data } = useAsync(() => (ready ? loadHome() : new Promise(() => {})), [v, ready]);

  const rows = [
    { to: '/songs', icon: <IconMusic />, label: 'Songs', count: data?.totals.songs },
    { to: '/artists', icon: <IconUser />, label: 'Artists' },
    { to: '/albums', icon: <IconAlbum />, label: 'Albums' },
    { to: '/playlists', icon: <IconList />, label: 'Playlists', count: data?.playlists.length },
    { to: '/favorites', icon: <IconHeart />, label: 'Favorites', count: favCount },
    { to: '/downloads', icon: <IconDownload />, label: 'On this device', count: dlCount },
  ];

  return (
    <div className="page">
      <div className="topbar">
        <div className="spacer" />
        <Link to="/search" className="icon-btn ringed" aria-label="Search"><IconSearch size={20} /></Link>
      </div>
      <h1 className="page-title">Library</h1>
      <div className="list">
        {rows.map((r) => (
          <Link key={r.to} to={r.to} className="nav-row">
            <span className="ico">{r.icon}</span>
            <span className="label">{r.label}</span>
            {r.count != null && <span className="count">{r.count}</span>}
            <span className="chev"><IconChevron size={20} /></span>
          </Link>
        ))}
      </div>

      {data?.recent?.length > 0 && (
        <section className="section">
          <div className="section-head"><h2 className="section-title">Recently played</h2></div>
          <SongList songs={data.recent.slice(0, 8)} />
        </section>
      )}
    </div>
  );
}
