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
import { decodeToken } from './utils/jwt';

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

      {/* Navigation Bar */}
      <header className="fixed top-0 w-full h-[70px] z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-8 shadow-sm">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-indigo-600 group-hover:bg-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-600/20 transition-all">
            <span className="material-symbols-outlined text-[22px]">restaurant</span>
          </div>
          <div>
            <h1 className="font-headline-md text-lg font-black text-slate-900 leading-none tracking-tight">CampusBites</h1>
            <p className="font-label-sm text-[11px] font-semibold text-slate-500 mt-0.5">College Dining & Canteen Hub</p>
          </div>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          {isStaffPath ? (
            <>
              {isStaffLoggedIn && (
                <nav className="hidden md:flex items-center gap-6">
                  <Link 
                    to="/staff" 
                    className={`font-label-md text-label-md transition-all ${
                      location.pathname === '/staff' 
                        ? 'text-primary border-b-2 border-primary pb-1 font-bold' 
                        : 'text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    Orders
                  </Link>
                  {userRole !== 'cook' && (
                    <Link 
                      to="/staff/menu" 
                      className={`font-label-md text-label-md transition-all ${
                        location.pathname === '/staff/menu' 
                          ? 'text-primary border-b-2 border-primary pb-1 font-bold' 
                          : 'text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      Edit Menu
                    </Link>
                  )}
                </nav>
              )}
              <div className="h-8 w-px bg-outline-variant/30 hidden md:block"></div>
              <div className="flex items-center gap-3">
                <Link 
                  to="/c/mithibai-main-campus" 
                  className="flex items-center gap-2 px-4 py-2 border border-primary/20 rounded-full font-label-md text-label-md text-primary bg-white/40 hover:bg-white/60 transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  <span>Student Menu</span>
                </Link>
                {isStaffLoggedIn && (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 border border-error/20 rounded-full font-label-md text-label-md text-error bg-white/40 hover:bg-white/60 transition-all active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>Logout</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/c/mithibai-main-campus"
                className="hidden sm:flex items-center gap-2 px-4 py-2 border border-primary/20 rounded-full font-label-md text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[16px]">school</span>
                <span>Mithibai Campus Menu</span>
              </Link>
              <Link
                to="/staff"
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-full font-label-md text-xs font-bold text-slate-700 bg-white/50 hover:bg-white transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
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
