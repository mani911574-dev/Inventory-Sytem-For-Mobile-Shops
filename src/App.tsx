import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { PosCheckout } from './pages/PosCheckout';
import { Products } from './pages/Products';
import { Categories } from './pages/Categories';
import { Purchases } from './pages/Purchases';
import { VendorPayments } from './pages/VendorPayments';
import { Customers } from './pages/Customers';
import { Udhar } from './pages/Udhar';
import { Reports } from './pages/Reports';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { ShopSettings } from './types';
import { settingsService } from './services/settingsService';
import { productService } from './services/productService';
import { customerService } from './services/customerService';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<ShopSettings | undefined>(undefined);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [overdueUdharCount, setOverdueUdharCount] = useState<number>(0);

  // Selected sub-entity filter across navigation jumps
  const [navVendorId, setNavVendorId] = useState<string | undefined>(undefined);
  const [navCustomerId, setNavCustomerId] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [shopData, prods, custs] = await Promise.all([
        settingsService.getShopSettings(),
        productService.getProducts(),
        customerService.getCustomers()
      ]);
      setSettings(shopData);

      // Low stock count
      const lowCount = prods.filter((p) => p.quantity <= p.min_stock_level).length;
      setLowStockCount(lowCount);

      // Udhar count
      const udharCount = custs.filter((c) => Number(c.current_udhar) > 0).length;
      setOverdueUdharCount(udharCount);
    } catch (err) {
      console.error('Error initializing app state', err);
    }
  };

  const handleNavigate = (tab: NavTab, entityId?: string) => {
    setCurrentTab(tab);
    if (tab === 'vendor-payments' && entityId) {
      setNavVendorId(entityId);
    }
    if (tab === 'udhar' && entityId) {
      setNavCustomerId(entityId);
    }
  };

  const getTabTitle = (tab: NavTab): string => {
    switch (tab) {
      case 'dashboard':
        return 'Business Overview Dashboard';
      case 'pos':
        return 'Point of Sale (POS Checkout)';
      case 'products':
        return 'Products & Mobile Inventory';
      case 'categories':
        return 'Product Categories';
      case 'purchases':
        return 'Purchases & Stock In';
      case 'vendor-payments':
        return 'Vendor Payables & Accounts';
      case 'customers':
        return 'Customer Directory & Accounts';
      case 'udhar':
        return 'Customer Udhar (Credit Ledger)';
      case 'reports':
        return 'Sales & Profit Reports';
      case 'analytics':
        return 'Analytics & Performance';
      case 'settings':
        return 'Shop Settings & Profile';
      default:
        return 'TechMobile Shop';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => handleNavigate(tab)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        lowStockCount={lowStockCount}
        overdueUdharCount={overdueUdharCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenPos={() => handleNavigate('pos')}
          currentTabName={getTabTitle(currentTab)}
          settings={settings}
          lowStockCount={lowStockCount}
          overdueUdharCount={overdueUdharCount}
        />

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <Dashboard onNavigate={handleNavigate} settings={settings} />
          )}
          {currentTab === 'pos' && <PosCheckout settings={settings} />}
          {currentTab === 'products' && <Products settings={settings} />}
          {currentTab === 'categories' && <Categories />}
          {currentTab === 'purchases' && <Purchases settings={settings} />}
          {currentTab === 'vendor-payments' && (
            <VendorPayments initialVendorId={navVendorId} settings={settings} />
          )}
          {currentTab === 'customers' && (
            <Customers
              onNavigateToUdhar={(custId) => handleNavigate('udhar', custId)}
              settings={settings}
            />
          )}
          {currentTab === 'udhar' && (
            <Udhar initialCustomerId={navCustomerId} settings={settings} />
          )}
          {currentTab === 'reports' && <Reports settings={settings} />}
          {currentTab === 'analytics' && <Analytics settings={settings} />}
          {currentTab === 'settings' && (
            <Settings onSettingsUpdated={(newSettings) => setSettings(newSettings)} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
