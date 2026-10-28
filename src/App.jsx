import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/Login.jsx';
import OwnerDashboard from './pages/OwnerDashboard.jsx';
import AgentFeed from './pages/AgentFeed.jsx';
import Listings from './pages/Listings.jsx';

function RequireRole({ children }) {
  let role = null;
  try { role = sessionStorage.getItem('pp-role'); } catch (e) {}
  if (!role) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireRole><OwnerDashboard /></RequireRole>} />
      <Route path="/feed" element={<RequireRole><AgentFeed /></RequireRole>} />
      <Route path="/listings" element={<RequireRole><Listings /></RequireRole>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
