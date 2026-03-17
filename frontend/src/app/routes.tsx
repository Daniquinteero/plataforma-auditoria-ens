import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { CreateAudit } from './components/CreateAudit';
import { AuditDetail } from './components/AuditDetail';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      {
        index: true,
        element: <Navigate to="/audit/1" replace />,
      },
      {
        path: 'create',
        Component: CreateAudit,
      },
      {
        path: 'audit/:auditId',
        Component: AuditDetail,
      },
    ],
  },
]);
