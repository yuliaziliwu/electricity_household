import { Navigate } from "react-router-dom";

import { getRedirectPathByRole, getStoredUser } from "hooks/useAuth";

export default function ProtectedRoute({ children, allowedRoles }) {
  const user = getStoredUser();

  if (!user?.user_id) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRedirectPathByRole(user.role)} replace />;
  }

  return children;
}
