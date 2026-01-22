import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'

import Home from './pages/Home'
import PartnerDashboard from './pages/PartnerDashboard'
import PromotionForm from './pages/PromotionForm'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import PartnerLogin from './pages/PartnerLogin'
import Advertise from './pages/Advertise'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Público */}
        <Route path="/" element={<Home />} />
        <Route path="/anuncie" element={<Advertise />} />

        {/* Parceiro */}
        <Route path="/parceiro/login" element={<PartnerLogin />} />

        <Route
          path="/parceiro/dashboard"
          element={
            <RequireAuth role="partner">
              <PartnerDashboard />
            </RequireAuth>
          }
        />

        <Route
          path="/nova-promocao"
          element={
            <RequireAuth role="partner">
              <PromotionForm />
            </RequireAuth>
          }
        />

        <Route
          path="/editar-promocao/:id"
          element={
            <RequireAuth role="partner">
              <PromotionForm />
            </RequireAuth>
          }
        />

        {/* Admin */}
        <Route path="/admin" element={<AdminLogin />} />

        <Route
          path="/admin/dashboard"
          element={
            <RequireAuth role="admin">
              <AdminDashboard />
            </RequireAuth>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
