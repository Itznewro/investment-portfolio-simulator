import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import OTPVerificationPage from "./pages/OTPVerificationPage";
import MFAVerificationPage from "./pages/MFAVerificationPage";
import MFASetupPage from "./pages/MFASetupPage";
import IntroPage from "./pages/IntroPage";
import DashboardPage from "./pages/DashboardPage";
import PortfolioPage from "./pages/PortfolioPage";
import HistoryPage from "./pages/HistoryPage";
import TradePage from "./pages/TradePage";
import StockDetailPage from "./pages/StockDetailPage";
import SettingsPage from "./pages/SettingsPage";
import ProtectedRoute from "./components/ProtectedRoute";

const protectedPage = (page) => <ProtectedRoute>{page}</ProtectedRoute>;

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-otp" element={<OTPVerificationPage />} />
      <Route path="/verify-mfa" element={<MFAVerificationPage />} />
      <Route path="/intro" element={protectedPage(<IntroPage />)} />
      <Route path="/dashboard" element={protectedPage(<DashboardPage />)} />
      <Route path="/portfolio" element={protectedPage(<PortfolioPage />)} />
      <Route path="/history" element={protectedPage(<HistoryPage />)} />
      <Route path="/trade" element={protectedPage(<TradePage />)} />
      <Route path="/stocks/:symbol" element={protectedPage(<StockDetailPage />)} />
      <Route path="/mfa/setup" element={protectedPage(<MFASetupPage />)} />
      <Route path="/settings" element={protectedPage(<SettingsPage />)} />
    </Routes>
  );
}



export default App;
