import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useSession } from './lib/hooks.js';
import { BottomNav } from './components/BottomNav.jsx';
import { MiniPlayer } from './components/MiniPlayer.jsx';
import { SheetHost } from './components/SheetHost.jsx';
import { Toaster } from './components/Toast.jsx';
import { Loading } from './components/Common.jsx';
import { isNative, takeNativeSharedFiles } from './lib/native.js';
import { stashSharedFiles } from './lib/importer.js';
import Home from './pages/Home.jsx';
import Auth from './pages/Auth.jsx';

const Search = lazy(() => import('./pages/Search.jsx'));
const Library = lazy(() => import('./pages/Library.jsx'));
const Songs = lazy(() => import('./pages/Songs.jsx'));
const Artists = lazy(() => import('./pages/Artists.jsx'));
const ArtistDetail = lazy(() => import('./pages/ArtistDetail.jsx'));
const Albums = lazy(() => import('./pages/Albums.jsx'));
const AlbumDetail = lazy(() => import('./pages/AlbumDetail.jsx'));
const Playlists = lazy(() => import('./pages/Playlists.jsx'));
const PlaylistDetail = lazy(() => import('./pages/PlaylistDetail.jsx'));
const Favorites = lazy(() => import('./pages/Favorites.jsx'));
const Downloads = lazy(() => import('./pages/Downloads.jsx'));
const Import = lazy(() => import('./pages/Import.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Stats = lazy(() => import('./pages/Stats.jsx'));
const NowPlaying = lazy(() => import('./pages/NowPlaying.jsx'));

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Android: open Import when the app is launched from the Share menu; back button behaves natively. */
function NativeBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!isNative) return;
    let sub;
    const checkShare = async () => {
      const files = await takeNativeSharedFiles();
      if (files.length) {
        await stashSharedFiles(files);
        navigate(`/import?shared=${Date.now()}`);
      }
    };
    checkShare();
    window.addEventListener('sendIntentReceived', checkShare);
    import('@capacitor/app').then(({ App }) => {
      sub = App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack && window.location.pathname !== '/') window.history.back();
        else App.minimizeApp(); // keep music playing instead of closing
      });
    });
    return () => {
      window.removeEventListener('sendIntentReceived', checkShare);
      sub?.then?.((s) => s.remove());
    };
  }, [navigate]);
  void location;
  return null;
}

export default function App() {
  const session = useSession();
  const location = useLocation();

  if (session.status === 'loading') return <Loading />;
  if (session.status === 'signedOut') {
    return (
      <>
        <Auth />
        <Toaster />
      </>
    );
  }

  const onPlayer = location.pathname === '/playing';

  return (
    <div className="app">
      <ScrollTop />
      <NativeBridge />
      <Suspense fallback={<div className="page"><Loading /></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/library" element={<Library />} />
          <Route path="/songs" element={<Songs />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/artists/:id" element={<ArtistDetail />} />
          <Route path="/albums" element={<Albums />} />
          <Route path="/albums/:id" element={<AlbumDetail />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/playlists/:id" element={<PlaylistDetail />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/import" element={<Import />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/playing" element={<NowPlaying />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {!onPlayer && (
        <div className="dock">
          <MiniPlayer />
          <BottomNav />
        </div>
      )}
      <SheetHost />
      <Toaster />
    </div>
  );
}
