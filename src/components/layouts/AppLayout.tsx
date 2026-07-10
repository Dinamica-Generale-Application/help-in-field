import { Outlet, NavLink } from 'react-router-dom';
import { ClipboardList, Map, Send, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StorageWarning } from '@/components/ui/StorageWarning';

const navItems = [
  { to: '/', label: 'Rapporti', icon: ClipboardList },
  { to: '/missions', label: 'Missioni', icon: Send },
  { to: '/map', label: 'Mappa', icon: Map },
  { to: '/settings', label: 'Impostazioni', icon: Settings },
] as const;

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <h1 className="text-lg font-semibold">Help in Field</h1>
          <nav className="flex items-center gap-1" aria-label="Navigazione principale">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[44px] min-w-[44px] justify-center',
                    isActive
                      ? 'bg-primary-foreground/20'
                      : 'hover:bg-primary-foreground/10',
                  )
                }
                aria-label={label}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4">
        <StorageWarning />
        <Outlet />
      </main>
    </div>
  );
}
