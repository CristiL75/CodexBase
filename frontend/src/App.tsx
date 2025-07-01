import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Componente
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pagini
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import TwoFASetup from './pages/TwoFASetup';
import TwoFAVerify from './pages/TwoFAVerify';

function App() {
  return (
    <ChakraProvider>
      <AuthProvider>
        <Router>
          <Navbar />
          <Routes>
            {/* Rute publice */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/2fa-verify" element={<TwoFAVerify />} />
            <Route path="/auth/success" element={<AuthCallback />} />
            
            {/* Rute protejate */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/2fa-setup" element={<TwoFASetup />} />
            </Route>
            
            {/* Rută implicită - redirecționează spre login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ChakraProvider>
  );
}

// Componenta pentru callback OAuth
const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken } = useAuth();
  
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    
    if (token) {
      localStorage.setItem('token', token);
      setToken(token);
      navigate('/');
    } else {
      navigate('/login');
    }
  }, [location, navigate, setToken]);
  
  return <div>Authenticating...</div>;
};

export default App;