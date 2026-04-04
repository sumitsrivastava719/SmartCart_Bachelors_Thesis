import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
            <ProtectedRoute>
              <BillPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
