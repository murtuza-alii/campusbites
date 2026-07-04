import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { StudentView } from './components/StudentView';
import { StaffView } from './components/StaffView';
import { StaffLogin } from './components/StaffLogin';
import { StaffOrders } from './components/StaffOrders';
import { StaffMenu } from './components/StaffMenu';
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
    <div className="min-h-screen flex flex-col selection:bg-primary-fixed antialiased relative">
      {/* Design System Background Elements */}
      <div className="noise"></div>
      <div className="blob bg-indigo-200 w-[500px] h-[500px] top-[-10%] left-[-5%]"></div>
      <div className="blob bg-pink-100 w-[400px] h-[400px] bottom-[10%] right-[10%]"></div>
      <div className="blob bg-emerald-50 w-[300px] h-[300px] top-[40%] left-[30%]"></div>

      {/* Navigation Bar */}
      <header className="fixed top-0 w-full h-[64px] z-50 bg-white/55 backdrop-blur-[16px] border-b border-white/45 flex items-center justify-between px-margin-mobile md:px-margin-desktop shadow-[0_32px_32px_rgba(31,38,135,0.03)]">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant</span>
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-primary leading-none">CampusBites</h1>
            <p className="font-label-sm text-label-sm text-on-surface-variant">College Canteen Hub</p>
          </div>
        </Link>

        <div className="flex items-center gap-6">
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
                  to="/" 
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
            <div className="flex items-center gap-2">
              <Link
                to="/staff"
                className="flex items-center gap-2 px-4 py-2 border border-primary/20 rounded-full font-label-md text-label-md text-primary bg-white/40 hover:bg-white/60 transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                <span>Staff Dashboard</span>
              </Link>
              <div className="w-10 h-10 rounded-full border border-white bg-white/30 flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined">account_circle</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-[96px] pb-[40px] px-margin-mobile md:px-margin-desktop max-w-container-max w-full mx-auto flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<StudentView />} />
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
          <p className="font-label-sm text-label-sm text-text-muted">© 2026 CampusBites. Made for college canteens.</p>
          <div className="flex gap-6">
            <a className="font-label-sm text-label-sm text-text-muted hover:text-primary transition-colors" href="#">Privacy Policy</a>
            <a className="font-label-sm text-label-sm text-text-muted hover:text-primary transition-colors" href="#">Terms of Service</a>
            <a className="font-label-sm text-label-sm text-text-muted hover:text-primary transition-colors" href="#">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
