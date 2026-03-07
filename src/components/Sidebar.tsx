import {
  LayoutDashboard,
  Users,
  Ship,
  UsersRound,
  UserPlus,
  FileText,
  Settings,
  X,
  Radio,
  Wrench,
  ClipboardList,
  Receipt,
  BookOpen,
  AlertTriangle,
  FileCheck,
  Package,
  UserCog,
  FilePlus,
  ClipboardCheck
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  // Master: All tabs, Staff: Most tabs (no Vessels, PMS), Crew: Limited tabs
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['master', 'crew', 'staff'] },
  // Documents Section
  { path: '/documents/manuals', label: 'Manuals', icon: BookOpen, roles: ['master', 'staff', 'crew'] },
  { path: '/documents/templates', label: 'Form Templates', icon: FilePlus, roles: ['master', 'staff'] },
  { path: '/documents/submissions', label: 'Submissions', icon: ClipboardCheck, roles: ['master', 'staff', 'crew'] },

  // Operational
  { path: '/pms', label: 'PMS', icon: Wrench, roles: ['master', 'staff', 'crew'] },
  { path: '/crew-logs', label: 'Daily Work Logs', icon: ClipboardList, roles: ['master', 'crew', 'staff'] },
  { path: '/emergency', label: 'Emergency Preparedness', icon: AlertTriangle, roles: ['master', 'staff'] },
  { path: '/incidents', label: 'Incident Reporting', icon: FileCheck, roles: ['master', 'crew', 'staff'] },
  { path: '/audits', label: 'Audits & Reviews', icon: FileCheck, roles: ['master', 'staff'] },
  { path: '/cargo', label: 'Cargo Operations', icon: Package, roles: ['master', 'crew', 'staff'] },
  { path: '/clients', label: 'Clients', icon: Users, roles: ['master', 'staff'] },
  { path: '/vessels', label: 'Vessels', icon: Ship, roles: ['master'] },
  { path: '/staff', label: 'Staff', icon: UserCog, roles: ['master'] },
  { path: '/crew', label: 'Crew', icon: UsersRound, roles: ['master', 'staff'] },
  { path: '/recruitment', label: 'Recruitment', icon: UserPlus, roles: ['master', 'staff'] },
  { path: '/onboarding', label: 'Onboarding', icon: ClipboardCheck, roles: ['crew'] },
  { path: '/dg-communication', label: 'DG Communication', icon: Radio, roles: ['master', 'staff'] },
  { path: '/invoices', label: 'Invoices', icon: Receipt, roles: ['master', 'staff'] },
  { path: '/settings', label: 'Settings', icon: Settings, roles: ['master', 'crew', 'staff'] },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter(item =>
    item.roles.includes(user?.role || 'staff')
  );

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-sidebar text-sidebar-foreground
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border">
          <Logo variant="full" iconSize="sm" />
          <button
            onClick={onClose}
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent rounded p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-6 py-3 
                  transition-colors duration-150
                  ${isActive
                    ? 'bg-sidebar-accent text-sidebar-primary border-l-4 border-sidebar-primary'
                    : 'hover:bg-sidebar-accent/50'
                  }
                `}
                onClick={onClose}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/60">
            © 2024 NMG Marine Service
          </div>
        </div>
      </aside>
    </>
  );
}