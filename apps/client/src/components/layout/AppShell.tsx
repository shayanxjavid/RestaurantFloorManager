import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  LayoutDashboard,
  Eye,
  Clock,
  Users,
  Settings,
  Menu,
  Moon,
  Sun,
  Bell,
  ChevronDown,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { UserRole } from '@rfm/shared';
import { useAuth } from '@/hooks/useAuth';
import { useUiStore } from '@/stores/uiStore';
import { useSocket } from '@/hooks/useSocket';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    to: '/floor-plan',
    label: 'Floor Plan',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    to: '/service',
    label: 'Service View',
    icon: <Eye className="h-5 w-5" />,
  },
  {
    to: '/shifts',
    label: 'Shifts',
    icon: <Clock className="h-5 w-5" />,
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    to: '/staff',
    label: 'Staff',
    icon: <Users className="h-5 w-5" />,
    roles: [UserRole.ADMIN],
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: <BarChart3 className="h-5 w-5" />,
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
];

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/floor-plan': 'Floor Plan Editor',
  '/service': 'Service View',
  '/shifts': 'Shift Management',
  '/staff': 'Staff Management',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const darkMode = useUiStore((s) => s.darkMode);
  const toggleDarkMode = useUiStore((s) => s.toggleDarkMode);
  const { onlineUsers } = useSocket();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const onlineCount = onlineUsers.filter((u) => u.online).length;
  const currentPageLabel = ROUTE_LABELS[location.pathname] || 'Page';

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-gray-200 bg-white transition-all duration-200 dark:border-gray-800 dark:bg-gray-900 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-[60px] items-center border-b border-gray-200 px-4 dark:border-gray-800">
          {sidebarOpen && (
            <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
              FloorView
            </span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="custom-scrollbar flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {filteredNavItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    } ${!sidebarOpen ? 'justify-center' : ''}`
                  }
                  title={!sidebarOpen ? item.label : undefined}
                >
                  {item.icon}
                  {sidebarOpen && <span className="animate-slide-in">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Online Users */}
        <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
          {sidebarOpen ? (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              {onlineCount} user{onlineCount !== 1 ? 's' : ''} online
            </div>
          ) : (
            <div className="flex justify-center" title={`${onlineCount} online`}>
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            </div>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-[60px] items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
          {/* Left: Hamburger + Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <span>FloorView</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {currentPageLabel}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Notifications */}
            <button
              className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden font-medium text-gray-700 dark:text-gray-300 md:inline">
                  {user?.name || 'User'}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {userMenuOpen && (
                <div className="animate-fade-in absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.email}
                    </p>
                    <p className="mt-1 text-xs font-medium text-brand-600 dark:text-brand-400">
                      {user?.role}
                    </p>
                  </div>
                  <NavLink
                    to="/settings"
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </NavLink>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="custom-scrollbar flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
