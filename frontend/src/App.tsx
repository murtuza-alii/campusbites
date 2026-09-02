import { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { StudentView } from './components/StudentView';
import { StaffView } from './components/StaffView';
import { StaffLogin } from './components/StaffLogin';
import { StaffOrders } from './components/StaffOrders';
import { StaffMenu } from './components/StaffMenu';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { SmoothCursor } from './components/ui/SmoothCursor';
import { InteractiveBackground } from './components/ui/InteractiveBackground';
import { ServerWarmupBanner } from './components/ServerWarmupBanner';
import { LegalPolicies } from './components/LegalPolicies';
import { decodeToken } from './utils/jwt';
import { UtensilsCrossed, ArrowLeft, LogOut, ShieldCheck, Utensils, Phone, Mail } from 'lucide-react';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isStaffLoggedIn, setIsStaffLoggedIn] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [staffCanteenSlug, setStaffCanteenSlug] = useState<string | null>(null);

  useEffect(() => {
    // Check if staff or admin token exists in localStorage
    const token = localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
    setIsStaffLoggedIn(!!token);
    if (token) {
      const decoded = decodeToken(token);
      setUserRole(decoded?.role || null);
      setStaffCanteenSlug(decoded?.canteenSlug || null);
    } else {
      setUserRole(null);
      setStaffCanteenSlug(null);
    }
  }, [location]);

  // Dynamically determine the destination when clicking "Menu"
  const targetMenuUrl = useMemo(() => {
    if (staffCanteenSlug) {
      return `/c/${staffCanteenSlug}`;
    }
    const lastSlug = localStorage.getItem('cb_last_diner_slug');
    if (lastSlug) {
      return `/c/${lastSlug}`;
    }
    return '/c/anand-stall';
  }, [staffCanteenSlug, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('adminToken');
    setIsStaffLoggedIn(false);
    setUserRole(null);
    setStaffCanteenSlug(null);
    navigate('/');
  };

  const isStaffPath = location.pathname.startsWith('/staff') || location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col antialiased relative bg-[#F8FAFC]">
      {/* MagicUI Fluid Smooth Cursor (Desktop/Fine-Pointer aware) */}
      <SmoothCursor />

      {/* ReactBits Dynamic Dot Matrix Canvas */}
      <InteractiveBackground />

      {/* Render Server Standby & Warmup Banner */}
      <ServerWarmupBanner />

      {/* Navigation Bar */}
      <header className={`fixed top-0 w-full z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between shadow-xs transition-all ${
        isStaffPath ? 'h-[52px] px-3 sm:px-6' : 'h-[64px] px-3.5 sm:px-8'
      }`}>
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-600 group-hover:bg-indigo-700 rounded-lg flex items-center justify-center text-white shadow-xs transition-all shrink-0">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm sm:text-base text-slate-900 leading-none tracking-tight">CampusBites</h1>
            {!isStaffPath && (
              <p className="hidden sm:block text-[11px] text-slate-500 mt-0.5 font-normal">College Dining & Canteen Hub</p>
            )}
          </div>
        </Link>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isStaffPath ? (
            <>
              {isStaffLoggedIn && (
                <nav className="hidden md:flex items-center gap-4 mr-1 text-xs font-semibold">
                  <Link 
                    to="/staff" 
                    className={`transition-colors ${
                      location.pathname === '/staff' 
                        ? 'text-indigo-600 font-bold' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Orders
                  </Link>
                  {userRole !== 'cook' && userRole !== 'delivery' && (
                    <Link 
                      to="/staff/menu" 
                      className={`transition-colors ${
                        location.pathname === '/staff/menu' 
                          ? 'text-indigo-600 font-bold' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Menu
                    </Link>
                  )}
                </nav>
              )}

              <div className="flex items-center gap-1.5 shrink-0">
                <Link 
                  to={targetMenuUrl} 
                  className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Menu</span>
                </Link>

                {isStaffLoggedIn && (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 border border-rose-200/80 rounded-lg text-xs font-medium text-rose-700 bg-rose-50/60 hover:bg-rose-100 transition-colors shadow-xs shrink-0"
                    title="Sign out of staff dashboard"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                to="/c/anand-stall"
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 border border-orange-200 rounded-full text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 transition-all active:scale-95 shadow-xs shrink-0"
              >
                <Utensils className="w-3.5 h-3.5 text-orange-600" />
                <span>Anand Stall Menu</span>
              </Link>
              {userRole === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-semibold transition-all active:scale-95 shadow-xs shrink-0"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span>Admin</span>
                </Link>
              )}
              <Link
                to="/staff"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 bg-slate-900 hover:bg-black text-white rounded-full text-xs font-semibold transition-all active:scale-95 shadow-xs shrink-0"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Staff</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`relative z-10 w-full mx-auto flex-1 flex flex-col ${
        isStaffPath 
          ? 'pt-[60px] pb-4 px-2.5 sm:px-4 max-w-7xl' 
          : 'pt-[84px] pb-10 px-margin-mobile md:px-margin-desktop max-w-container-max'
      }`}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/menu" element={<StudentView />} />
          <Route path="/c/:slug" element={<StudentView />} />
          <Route path="/canteen/:slug" element={<StudentView />} />
          <Route path="/staff" element={<StaffView />}>
            <Route index element={<StaffOrders />} />
            <Route path="menu" element={<StaffMenu />} />
          </Route>
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/staff/login/:slug" element={<StaffLogin />} />
          <Route path="/c/:slug/staff/login" element={<StaffLogin />} />
          <Route path="/canteen/:slug/staff/login" element={<StaffLogin />} />

          {/* Super Admin Executive Portal Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Legal, Customer Policies & Contact Routes for Payment Gateway Compliance */}
          <Route path="/terms" element={<LegalPolicies initialTab="terms" />} />
          <Route path="/terms-and-conditions" element={<LegalPolicies initialTab="terms" />} />
          <Route path="/privacy" element={<LegalPolicies initialTab="privacy" />} />
          <Route path="/privacy-policy" element={<LegalPolicies initialTab="privacy" />} />
          <Route path="/refund-policy" element={<LegalPolicies initialTab="refund" />} />
          <Route path="/cancellation-policy" element={<LegalPolicies initialTab="refund" />} />
          <Route path="/shipping-policy" element={<LegalPolicies initialTab="shipping" />} />
          <Route path="/delivery-policy" element={<LegalPolicies initialTab="shipping" />} />
          <Route path="/contact" element={<LegalPolicies initialTab="contact" />} />
          <Route path="/contact-us" element={<LegalPolicies initialTab="contact" />} />
          <Route path="/legal" element={<LegalPolicies initialTab="terms" />} />
        </Routes>
      </main>

      {/* Footer (Hidden on Operational Staff & Admin Routes) */}
      {!isStaffPath && (
        <footer className="w-full py-8 border-t border-slate-200/80 bg-white/70 backdrop-blur-md mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 space-y-6">
          {/* Main Footer Links & Info */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200/60 pb-6">
            <div className="space-y-1 max-w-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                </div>
                <span className="font-black text-slate-900 text-sm">CampusBites</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Smart food ordering & visual token ecosystem for college canteens and university diners.
              </p>
              <p className="text-[11px] text-slate-600 font-semibold pt-1">
                Operated by: <span className="font-bold text-slate-900">MURTUZA ALI</span>
              </p>
            </div>

            {/* Quick Links & Policies */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
              <div className="space-y-2">
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Campus Menus</p>
                <ul className="space-y-1.5 text-slate-600">
                  <li>
                    <Link to="/c/anand-stall" className="hover:text-orange-600 font-bold transition-colors">Anand Stall (Diner)</Link>
                  </li>
                  <li>
                    <Link to="/c/mithibai-main-campus" className="hover:text-indigo-600 transition-colors">Mithibai Campus</Link>
                  </li>
                  <li>
                    <Link to="/staff" className="hover:text-indigo-600 transition-colors">Staff Terminal</Link>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Legal & Policies</p>
                <ul className="space-y-1.5 text-slate-600">
                  <li>
                    <Link to="/terms" className="hover:text-indigo-600 transition-colors">Terms & Conditions</Link>
                  </li>
                  <li>
                    <Link to="/privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link>
                  </li>
                  <li>
                    <Link to="/refund-policy" className="hover:text-indigo-600 transition-colors">Refund Policy</Link>
                  </li>
                  <li>
                    <Link to="/shipping-policy" className="hover:text-indigo-600 transition-colors">Shipping Policy</Link>
                  </li>
                </ul>
              </div>

              <div className="space-y-2 col-span-2 sm:col-span-1">
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Support & Grievance</p>
                <ul className="space-y-1.5 text-slate-600">
                  <li>
                    <Link to="/contact" className="hover:text-indigo-600 transition-colors font-medium">Contact Us</Link>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-indigo-600 shrink-0" />
                    <a href="mailto:murtuzaali17th@gmail.com" className="hover:text-indigo-600 text-[11px] truncate">murtuzaali17th@gmail.com</a>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                    <a href="tel:+918432123450" className="hover:text-indigo-600 text-[11px]">+91 8432123450</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Copyright Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <p>© 2026 CampusBites. All rights reserved. Platform owned and operated by MURTUZA ALI.</p>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="hover:text-slate-800">Terms</Link>
              <span>·</span>
              <Link to="/privacy" className="hover:text-slate-800">Privacy</Link>
              <span>·</span>
              <Link to="/refund-policy" className="hover:text-slate-800">Refunds</Link>
              <span>·</span>
              <Link to="/contact" className="hover:text-slate-800">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}
