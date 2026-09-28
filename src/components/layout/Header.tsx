import React, { useState, useEffect } from 'react';
import { Menu, ShoppingCart, Bell, User, Clock, AlertTriangle } from 'lucide-react';
import { ShopSettings } from '../../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenPos: () => void;
  currentTabName: string;
  settings?: ShopSettings;
  lowStockCount?: number;
  overdueUdharCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenPos,
  currentTabName,
  settings,
  lowStockCount = 0,
  overdueUdharCount = 0
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }) + ' • ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {currentTabName}
          </h2>
          <p className="text-xs text-slate-400 font-medium hidden sm:block">
            {settings?.shop_name || 'TechMobile Shop & POS'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Time display */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200/60">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{timeStr}</span>
        </div>

        {/* Low stock warning chip */}
        {lowStockCount > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>{lowStockCount} Low Stock</span>
          </div>
        )}

        {/* Quick POS Button */}
        <button
          onClick={onOpenPos}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl shadow-sm shadow-indigo-600/20 transition"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>POS Checkout</span>
        </button>

        {/* User Chip */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-xs font-semibold text-slate-800">
              {settings?.owner_name || 'Admin'}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Shop Manager</div>
          </div>
        </div>
      </div>
    </header>
  );
};
