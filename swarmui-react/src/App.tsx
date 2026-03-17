import { useEffect, Suspense, lazy, useState } from 'react';
import { MantineProvider, AppShell, Loader, Center } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
import { ConnectionBanner } from './components/ConnectionBanner';
import { prefetchRoute } from './components/PrefetchLink';
import { preloadCriticalData } from './utils/preloadCriticalData';
import { swarmClient } from './api/client';
import { useSessionStore } from './stores/session';
import { useShallow } from 'zustand/react/shallow';
const GeneratePage = lazy(() => import('./pages/GeneratePage').then(module => ({ default: module.GeneratePage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(module => ({ default: module.HistoryPage })));
const QueuePage = lazy(() => import('./pages/QueuePage').then(module => ({ default: module.QueuePage })));
const WorkflowPage = lazy(() => import('./pages/WorkflowPage').then(module => ({ default: module.WorkflowPage })));
const ServerPage = lazy(() => import('./pages/ServerPage').then(module => ({ default: module.ServerPage })));
const RoleplayPage = lazy(() => import('./pages/RoleplayPage').then(module => ({ default: module.RoleplayPage })));
const AssetCatalogModal = lazy(() => import('./components/AssetCatalogModal').then(module => ({ default: module.AssetCatalogModal })));
const CommandPalette = lazy(() => import('./components/CommandPalette').then(module => ({ default: module.CommandPalette })));
const ModelDownloader = lazy(() => import('./components/ModelDownloader').then(module => ({ default: module.ModelDownloader })));
const CanvasWorkflowHost = lazy(() => import('./components/canvas/CanvasWorkflowHost').then(module => ({ default: module.CanvasWorkflowHost })));
// Skeleton for instant visual feedback while GeneratePage lazy-loads
import { GeneratePageSkeleton } from './components/GeneratePageSkeleton';
// Performance Dashboard - development only, lazy loaded
const PerformanceDashboard = lazy(() => import('./components/dev/PerformanceDashboard'));
import { theme } from './theme';
import { InstallPrompt, UpdateNotification } from './components/InstallPrompt';
import { initializeTheme, useThemeStore } from './store/themeStore';
import { initializeAnimationSettings } from './store/animationStore';
import { useViewTransition } from './hooks/useViewTransition';
import { useNavigationStore, type AppPage } from './stores/navigationStore';
import { AppHeader } from './components/layout/AppHeader';
import { useCanvasWorkflowStore } from './stores/canvasWorkflowStore';
import { usePromptCacheStore } from './stores/promptCacheStore';
import { isWebRuntimeTarget } from './config/runtimeTarget';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './styles/animations.css';
import { ErrorBoundary } from './components/ErrorBoundary';

type ElectronAPI = {
  version: string;
  shutdownApp?: () => Promise<boolean>;
  reloadWrapper?: () => Promise<boolean>;
};

// Initialize theme on app load
initializeTheme();
initializeAnimationSettings();

function shouldSkipStartupPrefetch(): boolean {
  const nav = navigator as Navigator & {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  };

  const connection = nav.connection;
  if (!connection) return false;

  if (connection.saveData) return true;
  return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
}

// CSS transition wrapper component - replaces Framer Motion AnimatePresence
function PageTransition({
  show,
  children,
  pageKey
}: {
  show: boolean;
  children: React.ReactNode;
  pageKey: string;
}) {
  if (!show) return null;

  return (
    <div
      key={pageKey}
      className="gpu-accelerated page-enter-active"
      style={{ height: '100%' }}
    >
      {children}
    </div>
  );
}

function AppContent() {
  const { currentPage, setCurrentPage, syncFromLocation } = useNavigationStore(useShallow((state) => ({
    currentPage: state.currentPage,
    setCurrentPage: state.setCurrentPage,
    syncFromLocation: state.syncFromLocation,
  })));
  const { startTransition } = useViewTransition();
  const electronAPI = (window as Window & { electronAPI?: ElectronAPI }).electronAPI;
  const [modelDownloaderOpen, setModelDownloaderOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [assetCatalogOpen, setAssetCatalogOpen] = useState(false);
  const isCanvasWorkflowActive = useCanvasWorkflowStore((state) => state.isOpen || state.upscalerOpen);

  // Get theme store state and sync function
  const { _hasHydrated, syncThemeCSS, currentTheme, isLightMode, customAccent } = useThemeStore(useShallow((state) => ({
    _hasHydrated: state._hasHydrated,
    syncThemeCSS: state.syncThemeCSS,
    currentTheme: state.currentTheme,
    isLightMode: state.isLightMode,
    customAccent: state.customAccent,
  })));

  // Sync theme CSS after Zustand hydration completes
  useEffect(() => {
    if (_hasHydrated) {
      // Re-apply theme CSS to ensure it's synced after hydration
      syncThemeCSS();
    }
  }, [_hasHydrated, syncThemeCSS]);

  // Also sync when theme values change (for good measure)
  useEffect(() => {
    syncThemeCSS();
  }, [currentTheme, isLightMode, customAccent, syncThemeCSS]);

  // Preload only Generate-adjacent data on idle to keep startup responsive.
  useEffect(() => {
    if (shouldSkipStartupPrefetch()) {
      return;
    }

    let dataId: number | null = null;
    let dataTimer: number | null = null;

    const schedulePreload = () => {
      if ('requestIdleCallback' in window) {
        dataId = requestIdleCallback(() => preloadCriticalData(), { timeout: 5000 });
      } else {
        dataTimer = setTimeout(preloadCriticalData, 2500);
      }
    };

    const startDelay = setTimeout(schedulePreload, 1200);

    return () => {
      clearTimeout(startDelay);

      if (dataId !== null) {
        cancelIdleCallback(dataId);
      }
      if (dataTimer !== null) {
        clearTimeout(dataTimer);
      }
    };
  }, []);

  // Keep frontend and backend caches bounded for long-running sessions.
  useEffect(() => {
    const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

    const pruneCaches = () => {
      usePromptCacheStore.getState().pruneOld(MAX_CACHE_AGE_MS);
    };

    pruneCaches();
    const intervalId = setInterval(pruneCaches, 30 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Handle page changes with View Transitions API
  const handlePageChange = (newPage: AppPage) => {
    if (newPage === currentPage) return;

    // Use View Transitions if supported, otherwise just set directly
    startTransition(() => {
      setCurrentPage(newPage);
    });
  };

  const handleShutdown = async () => {
    if (!window.confirm('Shutdown SwarmUI?\n\nThis will:\n- Stop the backend server\n- Close the application\n\nAre you sure?')) {
      return;
    }

    try {
      notifications.show({
        title: 'Shutting Down',
        message: 'Stopping backend server...',
        color: 'orange',
        autoClose: 5000,
      });

      await swarmClient.shutdownServer();

      if (electronAPI?.shutdownApp) {
        await electronAPI.shutdownApp();
        return;
      }

      notifications.show({
        title: 'Server Stopped',
        message: 'SwarmUI backend is stopped. You can close this tab/window.',
        color: 'gray',
        autoClose: false,
      });
    } catch (error) {
      console.error('Shutdown failed:', error);
      notifications.show({
        title: 'Shutdown Failed',
        message: 'Could not shut down server. You may need admin permissions.',
        color: 'red',
      });
    }
  };

  const handleReloadWrapper = async () => {
    try {
      if (electronAPI?.reloadWrapper) {
        await electronAPI.reloadWrapper();
        return;
      }
      window.location.reload();
    } catch (error) {
      console.error('Wrapper reload failed:', error);
      notifications.show({
        title: 'Reload Failed',
        message: 'Could not reload desktop wrapper.',
        color: 'red',
      });
    }
  };

  const handleLogout = async () => {
    try {
      await swarmClient.logout();
      useSessionStore.getState().clearSession();
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
      notifications.show({
        title: 'Logout Failed',
        message: 'Could not log out. Try refreshing the page.',
        color: 'red',
      });
    }
  };

  useEffect(() => {
    syncFromLocation();
  }, [syncFromLocation]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen((value) => !value);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Non-blocking connection status banner */}
      <ConnectionBanner autoHideDelay={2500} />

      {isWebRuntimeTarget && (
        <>
          <InstallPrompt position="bottom" />
          <UpdateNotification />
        </>
      )}

      <AppShell
        header={{ height: 'var(--app-header-height)' }}
        padding={0}
      >
        <AppShell.Header p="sm">
          <AppHeader
            currentPage={currentPage}
            onPageChange={handlePageChange}
            onPrefetchPage={(page) => {
              if (page !== currentPage) {
                prefetchRoute(page);
              }
            }}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            onOpenModelDownloader={() => setModelDownloaderOpen(true)}
            onReloadWrapper={handleReloadWrapper}
            onLogout={handleLogout}
            onShutdown={handleShutdown}
            onNavigateToQueue={() => setCurrentPage('queue')}
          />
        </AppShell.Header>

        <AppShell.Main>
          {/* GeneratePage: Keep-Alive Pattern - stays mounted to preserve state and avoid re-initialization */}
          <div
            style={{
              display: currentPage === 'generate' ? 'block' : 'none',
              height: '100%',
            }}
          >
            <Suspense fallback={<GeneratePageSkeleton />}>
              <GeneratePage />
            </Suspense>
          </div>

          {/* Other pages: CSS transition rendering (replaced AnimatePresence) */}
          <Suspense fallback={
            <Center h="100%">
              <Loader size="lg" />
            </Center>
          }>
            <PageTransition show={currentPage === 'history'} pageKey="history">
              <HistoryPage />
            </PageTransition>
            <PageTransition show={currentPage === 'queue'} pageKey="queue">
              <QueuePage />
            </PageTransition>
            <PageTransition show={currentPage === 'workflows'} pageKey="workflows">
              <WorkflowPage />
            </PageTransition>
            <PageTransition show={currentPage === 'server'} pageKey="server">
              <ServerPage />
            </PageTransition>
            <PageTransition show={currentPage === 'roleplay'} pageKey="roleplay">
              <RoleplayPage />
            </PageTransition>
          </Suspense>
        </AppShell.Main>
      </AppShell>

      {commandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            opened={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
            onOpenAssetCatalog={() => {
              setCommandPaletteOpen(false);
              setAssetCatalogOpen(true);
            }}
          />
        </Suspense>
      )}

      {assetCatalogOpen && (
        <Suspense fallback={null}>
          <AssetCatalogModal
            opened={assetCatalogOpen}
            onClose={() => setAssetCatalogOpen(false)}
          />
        </Suspense>
      )}

      {/* Performance Dashboard - development only */}
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <PerformanceDashboard />
        </Suspense>
      )}

      {isCanvasWorkflowActive && (
        <Suspense fallback={null}>
          <CanvasWorkflowHost />
        </Suspense>
      )}

      {modelDownloaderOpen && (
        <Suspense fallback={null}>
          <ModelDownloader
            opened={modelDownloaderOpen}
            onClose={() => setModelDownloaderOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}

function App() {
  const isLightMode = useThemeStore((state) => state.isLightMode);

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        theme={theme}
        defaultColorScheme="dark"
        forceColorScheme={isLightMode ? 'light' : 'dark'}
      >
        <Notifications
          position="bottom-right"
          styles={() => ({
            root: {
              backgroundColor: 'var(--theme-gray-8)',
            },
            notification: {
              backgroundColor: 'var(--theme-gray-8)',
              borderLeft: '3px solid var(--theme-brand)',
            },
          })}
        />
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
