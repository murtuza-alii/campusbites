import { Navigate, Outlet } from 'react-router-dom';

export function StaffView() {
  const token = localStorage.getItem('staffToken');

  // If token is missing, redirect to staff login page
  if (!token) {
    return <Navigate to="/staff/login" replace />;
  }

  return (
    <div className="w-full flex-1 flex flex-col">
      <Outlet />
    </div>
  );
}
