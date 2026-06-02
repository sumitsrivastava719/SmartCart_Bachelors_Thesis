import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import AuthPage from './components/AuthPage.jsx'
import ProfilePage from './components/ProfilePage.jsx'
import BillPage from './components/BillPage.jsx'

function ProtectedRoute({ children }) {
  const user = localStorage.getItem('smartcart_current_user');
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// Bill route: public if ?data= param exists (shared QR), protected otherwise
function BillRouteGuard({ children }) {
  const [searchParams] = useSearchParams();
  const hasSharedData = searchParams.has('data');
  const user = localStorage.getItem('smartcart_current_user');

  // Allow shared bill view without login
  if (hasSharedData) {
    return children;
  }

  // Require login for viewing own bill
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AuthRoute({ children }) {
  const user = localStorage.getItem('smartcart_current_user');
  if (user) {
    return <Navigate to="/cart" replace />;
  }
  return children;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <AuthRoute>
              <AuthPage />
            </AuthRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bill"
          element={
            <BillRouteGuard>
              <BillPage />
            </BillRouteGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
