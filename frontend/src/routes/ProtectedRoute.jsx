import { Navigate } from "react-router-dom";

import { APP_MESSAGES } from "constants/messages";
import { getRedirectPathByRole, getStoredUser } from "hooks/useAuth";

export default function ProtectedRoute({ children, allowedRoles }) {
  const user = getStoredUser();

  if (!user?.user_id) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          message: APP_MESSAGES.auth.loginRequired,
          type: "error",
        }}
      />
    );
  }

  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRedirectPathByRole(user.role)} replace />;
  }

  return children;
}
