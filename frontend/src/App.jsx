import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Feed from './pages/Feed';
import Tribunal from './pages/Tribunal';
import MyBets from './pages/MyBets';
import CreateBet from './pages/CreateBet';
import Settings from './pages/Settings';
import Navbar from './components/Navbar';

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

function AppLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-brand-bg)' }}>
      <Navbar />
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1e1e2e',
            color: '#f0f0ff',
            border: '1px solid #2a2a3d',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 600,
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout><Feed /></AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/tribunal"
          element={
            <PrivateRoute>
              <AppLayout><Tribunal /></AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/mis-apuestas"
          element={
            <PrivateRoute>
              <AppLayout><MyBets /></AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/crear"
          element={
            <PrivateRoute>
              <AppLayout><CreateBet /></AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <AppLayout><Settings /></AppLayout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
