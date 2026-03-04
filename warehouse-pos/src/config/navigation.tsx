/**
 * Single source of truth for app navigation. Used by both Sidebar (desktop) and MobileMenu
 * so new routes/features appear on desktop and mobile without drift.
 */
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  BarChart3,
  Settings,
  Users,
  MapPin,
  Receipt,
  Truck,
} from 'lucide-react';
import { PERMISSIONS, type Permission } from '../types/permissions';

export interface NavItem {
  name: string;
  to: string;
  icon: LucideIcon;
  permission?: Permission;
  anyPermissions?: Permission[];
}

export const BASE_NAVIGATION: NavItem[] = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD.VIEW },
  { name: 'Inventory', to: '/inventory', icon: Package, permission: PERMISSIONS.INVENTORY.VIEW },
  { name: 'Orders', to: '/orders', icon: ClipboardList, permission: PERMISSIONS.ORDERS.VIEW },
  { name: 'POS', to: '/pos', icon: ShoppingCart, permission: PERMISSIONS.POS.ACCESS },
  { name: 'Sales', to: '/sales', icon: Receipt, permission: PERMISSIONS.REPORTS.VIEW_SALES },
  { name: 'Deliveries', to: '/deliveries', icon: Truck, permission: PERMISSIONS.REPORTS.VIEW_SALES },
  {
    name: 'Reports',
    to: '/reports',
    icon: BarChart3,
    anyPermissions: [
      PERMISSIONS.REPORTS.VIEW_SALES,
      PERMISSIONS.REPORTS.VIEW_INVENTORY,
      PERMISSIONS.REPORTS.VIEW_PROFIT,
    ],
  },
  { name: 'Users', to: '/users', icon: Users, permission: PERMISSIONS.USERS.VIEW },
  { name: 'Settings', to: '/settings', icon: Settings, permission: PERMISSIONS.SETTINGS.VIEW },
];

/** Re-export for components that need MapPin (warehouse switcher) */
export { MapPin };
