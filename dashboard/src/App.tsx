import { NavLink, Route, Routes } from 'react-router-dom';
import { useUserIdFromQuery } from './hooks/useUserId';
import BracketsPage from './pages/BracketsPage';
import HistoryPage from './pages/HistoryPage';
import ThemesPage from './pages/ThemesPage';
import SignalsPage from './pages/SignalsPage';
import './App.css';

function DashboardNav() {
  const userId = useUserIdFromQuery();
  const search = userId ? `?userId=${encodeURIComponent(userId)}` : '';

  return (
    <nav className="dashboard-nav" aria-label="Dashboard">
      <NavLink to={`/${search}`} end>
        Brackets
      </NavLink>
      <NavLink to={`/themes${search}`}>Themes</NavLink>
      <NavLink to={`/signals${search}`}>Signals</NavLink>
      <NavLink to={`/history${search}`}>History</NavLink>
    </nav>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <DashboardNav />
      <Routes>
        <Route path="/" element={<BracketsPage />} />
        <Route path="/themes" element={<ThemesPage />} />
        <Route path="/signals" element={<SignalsPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </div>
  );
}
