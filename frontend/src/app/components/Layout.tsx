import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <Outlet />
    </div>
  );
}
