import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import IntroPage from "./pages/IntroPage";
import DashboardPage from "./pages/DashboardPage";
import PortfolioPage from "./pages/PortfolioPage";
import HistoryPage from "./pages/HistoryPage";
import TradePage from "./pages/TradePage";
import StockDetailPage from "./pages/StockDetailPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/intro" element={<IntroPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/portfolio" element={<PortfolioPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/trade" element={<TradePage />} />
      <Route path="/stocks/:symbol" element={<StockDetailPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}



export default App;