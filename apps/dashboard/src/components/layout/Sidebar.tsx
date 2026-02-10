'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  Users,
  BarChart3,
  CheckCircle,
  Building2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
  Package,
  Globe,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navigationItems = [
  { key: 'dashboard', href: '/', icon: LayoutDashboard },
  { key: 'content', href: '/content', icon: FileText },
  { key: 'products', href: '/products', icon: Package },
  { key: 'landingPages', href: '/landing-pages', icon: Globe },
  { key: 'email', href: '/email', icon: Mail },
  { key: 'leads', href: '/leads', icon: Users },
  { key: 'analytics', href: '/analytics', icon: BarChart3 },
  { key: 'approvals', href: '/approvals', icon: CheckCircle },
  { key: 'brands', href: '/brands', icon: Building2 },
  { key: 'ads', href: '/ads', icon: Megaphone },
  { key: 'settings', href: '/settings', icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const t = useTranslations('nav');

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              S6
            </div>
            <span className="text-lg font-semibold">Synap6ia</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1.5 hover:bg-accent"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navigationItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
              title={collapsed ? t(item.key) : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <span className="flex items-center gap-2">
                  {t(item.key)}
                  {'badge' in item && item.badge && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      <Clock className="h-2.5 w-2.5" />
                      {item.badge}
                    </span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">
              {t('agentsActive', { count: 3 })}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
