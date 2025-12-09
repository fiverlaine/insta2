import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAdminAuthenticated } from '@/utils/adminAuth';

interface RequireAdminAuthProps {
  children: ReactNode;
}

export default function RequireAdminAuth({ children }: RequireAdminAuthProps) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(isAdminAuthenticated());
    setLoading(false);
  }, []);

  if (loading) {
    return null;
  }

  if (!authenticated) {
    return (
      <Navigate
        to="/admin987654321/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}

