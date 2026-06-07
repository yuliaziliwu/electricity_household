import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import RtlLayout from "layouts/rtl";
import AdminLayout from "layouts/admin";
import Login from "views/auth/Login";
import Register from "views/auth/Register";
import Landing from "views/landing/Landing";
import UserDashboard from "views/dashboard/UserDashboard";
import AdminDashboard from "views/dashboard/AdminDashboard";
import TagihanPage from "views/tagihan/TagihanPage";
import AlatPage from "views/alat/AlatPage";
import PemakaianPage from "views/pemakaian/PemakaianPage";
import PrediksiPage from "views/prediksi/PrediksiPage";
import RekomendasiPage from "views/rekomendasi/RekomendasiPage";
import ProtectedRoute from "routes/ProtectedRoute";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />
      <Route path="auth/sign-in" element={<Navigate to="/login" replace />} />
      <Route
        path="dashboard"
        element={
          <ProtectedRoute allowedRoles={["end_user"]}>
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="tagihan"
        element={
          <ProtectedRoute allowedRoles={["admin", "end_user"]}>
            <TagihanPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="alat"
        element={
          <ProtectedRoute allowedRoles={["admin", "end_user"]}>
            <AlatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="pemakaian"
        element={
          <ProtectedRoute allowedRoles={["admin", "end_user"]}>
            <PemakaianPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="prediksi"
        element={
          <ProtectedRoute allowedRoles={["admin", "end_user"]}>
            <PrediksiPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="rekomendasi"
        element={
          <ProtectedRoute allowedRoles={["admin", "end_user"]}>
            <RekomendasiPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="admin/*"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      />
      <Route path="rtl/*" element={<RtlLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
