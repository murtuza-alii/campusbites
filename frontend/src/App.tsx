import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Coffee, Shield, ArrowLeft, LogOut } from 'lucide-react';
import { StudentView } from './components/StudentView';
import { StaffView } from './components/StaffView';
import { StaffLogin } from './components/StaffLogin';
import { StaffOrders } from './components/StaffOrders';
import { StaffMenu } from './components/StaffMenu';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isStaffLoggedIn, setIsStaffLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    // Check if staff token exists in localStorage
    const token = localStorage.getItem('staffToken');
    setIsStaffLoggedIn(!!token);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('staffToken');
    setIsStaffLoggedIn(false);
    navigate('/');
  };

  const isStaffPath = location.pathname.startsWith('/staff');

  return (
    <div className="min-h-screen bg-neutral-bg1 text-text-primary flex flex-col selection:bg-brand/30 selection:text-white">
      {/* Top Glassmorphic Navigation Bar */}
      <header className="sticky top-0 z-40 w-full glass border-b border-border-subtle px-4 py-3 sm:px-6 md:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-all duration-300 shadow-glow">
            <Coffee className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="font-semibold text-lg tracking-tight text-text-primary">CampusBites</h1>
            <p className="text-xs text-text-muted">College Canteen Hub</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {isStaffPath ? (
            <>
              {isStaffLoggedIn && (
                <>
                  <Link 
                    to="/staff" 
                    className={`text-sm px-3.5 py-1.5 rounded-lg transition-all duration-200 ${
                      location.pathname === '/staff' 
                        ? 'bg-brand/15 text-brand font-medium border border-brand/35' 
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }`}
                  >
                    Orders
                  </Link>
                  <Link 
                    to="/staff/menu" 
                    className={`text-sm px-3.5 py-1.5 rounded-lg transition-all duration-200 ${
                      location.pathname === '/staff/menu' 
                        ? 'bg-brand/15 text-brand font-medium border border-brand/35' 
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }`}
                  >
                    Edit Menu
                  </Link>
                </>
              )}
              <Link 
                to="/" 
                className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Student Menu
              </Link>
              {isStaffLoggedIn && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm text-status-error/80 hover:text-status-error px-3 py-1.5 rounded-lg hover:bg-status-error/10 transition-all duration-200 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              )}
            </>
          ) : (
            <Link
              to="/staff"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-brand hover:text-white bg-brand/10 hover:bg-brand border border-brand/20 hover:border-transparent px-3.5 py-1.75 rounded-lg transition-all duration-300"
            >
              <Shield className="w-4 h-4" />
              Staff Dashboard
            </Link>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col">
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
      <footer className="w-full py-4 text-center text-xs text-text-muted border-t border-border-subtle mt-auto">
        &copy; {new Date().getFullYear()} CampusBites. Made for college canteens.
      </footer>
    </div>
  );
}
