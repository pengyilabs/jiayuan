import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/Login.jsx';
import AgentFeed from './pages/AgentFeed.jsx';
import Listings from './pages/Listings.jsx';
import Buildings from './pages/Buildings.jsx';
import Agents from './pages/Agents.jsx';
import { getRole } from './lib/session.js';

function RequireRole({ children }) {
  let role = null;
  try {
    role = sessionStorage.getItem('pp-role');
  } catch (e) {}
  if (!role) return <Navigate to="/login" replace />;
  return children;
}

// M5 roles: the agent roster page is owner-only.
function RequireOwner({ children }) {
  if (getRole() === 'agent') return <Navigate to="/listings" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireRole>
            <Listings />
          </RequireRole>
        }
      />
      <Route
        path="/listings"
        element={
          <RequireRole>
            <Listings />
          </RequireRole>
        }
      />
      <Route
        path="/buildings"
        element={
          <RequireRole>
            <Buildings />
          </RequireRole>
        }
      />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route
        path="/feed"
        element={
          <RequireRole>
            <AgentFeed />
          </RequireRole>
        }
      />
      <Route
        path="/agents"
        element={
          <RequireRole>
            <RequireOwner>
              <Agents />
            </RequireOwner>
          </RequireRole>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
