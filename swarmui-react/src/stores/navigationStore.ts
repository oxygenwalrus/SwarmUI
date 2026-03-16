import { create } from 'zustand';
import {
    getCurrentHashRoute,
    isRouteEqual,
    normalizeRoute,
    parseHashRoute,
    serializeRoute,
    type AppPage,
    type AppRoute,
    type GenerateWorkspaceMode,
    type HistoryRouteState,
    type QueueRouteState,
    type RoleplayRouteState,
    type ServerRouteState,
    type WorkflowRouteState,
} from '../routing/appRoute';

const LAST_ROUTE_KEY = 'swarmui-last-route-v1';

interface NavigationStore {
    route: AppRoute;
    currentPage: AppPage;
    navigate: (nextRoute: Partial<AppRoute>) => void;
    syncFromLocation: () => void;
    setCurrentPage: (page: AppPage) => void;
    navigateToGenerate: (options?: Partial<AppRoute['generate']>) => void;
    navigateToHistory: (options?: Partial<HistoryRouteState>) => void;
    navigateToQueue: (options?: Partial<QueueRouteState>) => void;
    navigateToWorkflows: (options?: Partial<WorkflowRouteState>) => void;
    navigateToServer: (options?: Partial<ServerRouteState>) => void;
    navigateToRoleplay: (options?: Partial<RoleplayRouteState>) => void;
    setGenerateMode: (mode: GenerateWorkspaceMode) => void;
}

function readStoredRoute(): AppRoute {
    if (typeof window === 'undefined') {
        return normalizeRoute({ page: 'generate' });
    }

    if (window.location.hash) {
        return getCurrentHashRoute();
    }

    try {
        const rawValue = window.localStorage.getItem(LAST_ROUTE_KEY);
        if (rawValue) {
            return normalizeRoute(JSON.parse(rawValue) as AppRoute);
        }
    } catch {
        // Ignore persisted route parse failures and fall back to defaults.
    }

    return normalizeRoute({ page: 'generate' });
}

function persistRoute(route: AppRoute): void {
    if (typeof window === 'undefined') {
        return;
    }

    const serialized = serializeRoute(route);
    if (window.location.hash !== serialized) {
        window.location.hash = serialized;
    }

    window.localStorage.setItem(LAST_ROUTE_KEY, JSON.stringify(route));
}

function mergeRoute(current: AppRoute, nextRoute: Partial<AppRoute>): AppRoute {
    return normalizeRoute({
        ...current,
        ...nextRoute,
        generate: {
            ...current.generate,
            ...nextRoute.generate,
        },
        history: {
            ...current.history,
            ...nextRoute.history,
        },
        queue: {
            ...current.queue,
            ...nextRoute.queue,
        },
        workflows: {
            ...current.workflows,
            ...nextRoute.workflows,
        },
        server: {
            ...current.server,
            ...nextRoute.server,
        },
        roleplay: {
            ...current.roleplay,
            ...nextRoute.roleplay,
        },
    });
}

const initialRoute = readStoredRoute();

export const useNavigationStore = create<NavigationStore>((set, get) => ({
    route: initialRoute,
    currentPage: initialRoute.page,

    navigate: (nextRoute) => {
        const merged = mergeRoute(get().route, nextRoute);
        if (isRouteEqual(get().route, merged)) {
            return;
        }

        persistRoute(merged);
        set({
            route: merged,
            currentPage: merged.page,
        });
    },

    syncFromLocation: () => {
        if (typeof window === 'undefined') {
            return;
        }

        const nextRoute = parseHashRoute(window.location.hash || serializeRoute({ page: 'generate' }));
        if (isRouteEqual(get().route, nextRoute)) {
            return;
        }

        set({
            route: nextRoute,
            currentPage: nextRoute.page,
        });
        window.localStorage.setItem(LAST_ROUTE_KEY, JSON.stringify(nextRoute));
    },

    setCurrentPage: (page) => get().navigate({ page }),

    navigateToGenerate: (options = {}) => get().navigate({
        page: 'generate',
        generate: options,
    }),

    navigateToHistory: (options = {}) => get().navigate({
        page: 'history',
        history: options,
    }),

    navigateToQueue: (options = {}) => get().navigate({
        page: 'queue',
        queue: options,
    }),

    navigateToWorkflows: (options = {}) => get().navigate({
        page: 'workflows',
        workflows: options,
    }),

    navigateToServer: (options = {}) => get().navigate({
        page: 'server',
        server: options,
    }),

    navigateToRoleplay: (options = {}) => get().navigate({
        page: 'roleplay',
        roleplay: options,
    }),

    setGenerateMode: (mode) => get().navigate({
        page: 'generate',
        generate: {
            ...get().route.generate,
            mode,
        },
    }),
}));

if (typeof window !== 'undefined') {
    const syncFromLocation = () => useNavigationStore.getState().syncFromLocation();
    window.addEventListener('hashchange', syncFromLocation);
}

export type {
    AppPage,
    AppRoute,
    GenerateRouteState,
    GenerateWorkspaceMode,
    HistoryRouteState,
    QueueRouteState,
    RoleplayRouteState,
    ServerRouteState,
    WorkflowRouteState,
} from '../routing/appRoute';
