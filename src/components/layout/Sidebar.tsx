import React from 'react';
import {
  LayoutDashboard,
  Smartphone,
  FolderTree,
  Building2,
  PackagePlus,
  CreditCard,
  ShoppingCart,
  Users,
  Clock,
  FileText,
  BarChart3,
  Settings,
  X,
  Store
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'vendors'
  | 'purchases'
  | 'vendor-payments'
  | 'pos'
  | 'customers'
  | 'udhar'
  | 'reports'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
  lowStockCount?: number;
  overdueUdharCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  lowStockCount = 0,
  overdueUdharCount = 0
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos' as NavTab, label: 'POS Checkout', icon: ShoppingCart, highlight: true },
    { id: 'products' as NavTab, label: 'Products / Inventory', icon: Smartphone, badge: lowStockCount > 0 ? lowStockCount : undefined, badgeColor: 'bg-rose-500' },
    { id: 'categories' as NavTab, label: 'Categories', icon: FolderTree },
    { id: 'purchases' as NavTab, label: 'Purchases / Stock In', icon: PackagePlus },
    { id: 'vendors' as NavTab, label: 'Vendors', icon: Building2 },
    { id: 'vendor-payments' as NavTab, label: 'Vendor Payments', icon: CreditCard },
    { id: 'customers' as NavTab, label: 'Customers', icon: Users },
    { id: 'udhar' as NavTab, label: 'Customer Udhar', icon: Clock, badge: overdueUdharCount > 0 ? overdueUdharCount : undefined, badgeColor: 'bg-amber-500' },
    { id: 'reports' as NavTab, label: 'Sales Reports', icon: FileText },
    { id: 'analytics' as NavTab, label: 'Analytics', icon: BarChart3 },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">TechMobile</h1>
              <p className="text-[11px] text-slate-400 font-medium">POS & Inventory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : item.highlight
                    ? 'text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/60 hover:text-white border border-indigo-800/40'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition ${
                      isActive ? 'text-white' : item.highlight ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-800/70 text-xs text-slate-400 bg-slate-950/30">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">Shop System</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
              v1.0 Online
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Karachi Market Edition</p>
        </div>
      </aside>
    </>
  );
};
