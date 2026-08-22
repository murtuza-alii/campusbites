import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { StudentView } from './components/StudentView';
import { StaffView } from './components/StaffView';
import { StaffLogin } from './components/StaffLogin';
import { StaffOrders } from './components/StaffOrders';
import { StaffMenu } from './components/StaffMenu';
import { SmoothCursor } from './components/ui/SmoothCursor';
import { InteractiveBackground } from './components/ui/InteractiveBackground';
import { ServerWarmupBanner } from './components/ServerWarmupBanner';
import { decodeToken } from './utils/jwt';
import { UtensilsCrossed, ArrowLeft, LogOut, ShieldCheck, Utensils } from 'lucide-react';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isStaffLoggedIn, setIsStaffLoggedIn] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Check if staff token exists in localStorage
    const token = localStorage.getItem('staffToken');
    setIsStaffLoggedIn(!!token);
    if (token) {
      const decoded = decodeToken(token);
      setUserRole(decoded?.role || null);
    } else {
      setUserRole(null);
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('staffToken');
    setIsStaffLoggedIn(false);
    setUserRole(null);
    navigate('/');
  };

  const isStaffPath = location.pathname.startsWith('/staff');

  return (
    <div className="min-h-screen flex flex-col antialiased relative bg-[#F8FAFC]">
      {/* MagicUI Fluid Smooth Cursor (Desktop/Fine-Pointer aware) */}
      <SmoothCursor />

      {/* ReactBits Dynamic Dot Matrix Canvas */}
      <InteractiveBackground />

      {/* Render Server Standby & Warmup Banner */}
      <ServerWarmupBanner />

      {/* Navigation Bar */}
      <header className="fixed top-0 w-full h-[68px] z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/90 flex items-center justify-between px-3.5 sm:px-8 shadow-sm">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-600 group-hover:bg-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-600/25 transition-all shrink-0">
            <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-base sm:text-lg text-slate-900 leading-none tracking-tight">CampusBites</h1>
            <p className="hidden sm:block text-[11px] font-semibold text-slate-500 mt-0.5">College Dining & Canteen Hub</p>
          </div>
        </Link>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {isStaffPath ? (
            <>
              {isStaffLoggedIn && (
                <nav className="hidden md:flex items-center gap-5 mr-2">
                  <Link 
                    to="/staff" 
                    className={`text-xs font-bold transition-all ${
                      location.pathname === '/staff' 
                        ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' 
                        : 'text-slate-600 hover:text-indigo-600'
                    }`}
                  >
                    Orders
                  </Link>
                  {userRole !== 'cook' && (
                    <Link 
                      to="/staff/menu" 
                      className={`text-xs font-bold transition-all ${
                        location.pathname === '/staff/menu' 
                          ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' 
                          : 'text-slate-600 hover:text-indigo-600'
                      }`}
                    >
                      Edit Menu
                    </Link>
                  )}
                </nav>
              )}

              <div className="flex items-center gap-2 shrink-0">
                <Link 
                  to="/c/mithibai-main-campus" 
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 border border-slate-200/90 rounded-full text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all active:scale-95 shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="hidden xs:inline">Student </span>
                  <span>Menu</span>
                </Link>

                {isStaffLoggedIn && (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 border border-rose-200 rounded-full text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-all active:scale-95 shadow-sm shrink-0"
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
                to="/c/mithibai-main-campus"
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 border border-indigo-200 rounded-full text-xs font-bold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 transition-all active:scale-95 shadow-sm shrink-0"
              >
                <Utensils className="w-3.5 h-3.5 text-indigo-600" />
                <span>Mithibai Campus Menu</span>
              </Link>
              <Link
                to="/staff"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-900 hover:bg-black text-white rounded-full text-xs font-bold transition-all active:scale-95 shadow-sm shrink-0"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Staff Portal</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-[96px] pb-[40px] px-margin-mobile md:px-margin-desktop max-w-container-max w-full mx-auto flex-1 flex flex-col">
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
        </Routes>
      </main>

      {/* Footer */}
      <footer className="w-full py-stack-lg border-t border-white/40 bg-white/30 backdrop-blur-md">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-label-sm text-label-sm text-text-muted">© 2026 CampusBites. Made for college canteens & university food courts.</p>
          <div className="flex gap-6">
            <Link className="font-label-sm text-label-sm text-text-muted hover:text-primary transition-colors" to="/c/mithibai-main-campus">Mithibai Campus</Link>
            <Link className="font-label-sm text-label-sm text-text-muted hover:text-primary transition-colors" to="/c/downtown-diner">Downtown Diner</Link>
            <Link className="font-label-sm text-label-sm text-text-muted hover:text-primary transition-colors" to="/staff">Staff Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
