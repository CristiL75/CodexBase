import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext'; // 👈 ADAUGĂ ACEST IMPORT
import { tokenManager } from './utils/tokenManager';
import RepositoryViewPage from './pages/RepositoryViewPage';
import StarredRepositoriesPage from './pages/StarredRepositoriesPage';
import UserProfilePage from './pages/UserProfilePage';
import ExplorePage from './pages/ExplorePage';
// Componente
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pagini
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import TwoFASetup from './pages/TwoFASetup';
import TwoFAVerify from './pages/TwoFAVerify';
import ProfilePage from './pages/ProfilePage';
import NewRepositoryPage from './pages/NewRepositoryPage';
import RepositoriesPage from './pages/RepositoriesPage';
import NotificationsPage from './pages/NotificationsPage';
import RepositoryPullRequestsPage from './pages/RepositoryPullRequestsPage';
import OrganizationListPage from './pages/OrganizationListPage';
import OrganizationCreatePage from './pages/OrganizationCreatePage';
import OrganizationDetailPage from './pages/OrganizationDetailPage';


function App() {
  return (
    <ChakraProvider>
      <AuthProvider>
        <NotificationProvider> 
        <Router>
          <ConditionalNavbar />
          <Routes>
            {/* Rute publice */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/2fa-verify" element={<TwoFAVerify />} />
            <Route path="/auth/success" element={<AuthCallback />} />
            <Route path="/explore" element={<ExplorePage />} /> {/* <-- Adăugat aici */}
               
           


            {/* Rute protejate */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/2fa-setup" element={<TwoFASetup />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/new-repo" element={<NewRepositoryPage />} />
              <Route path="/repositories" element={<RepositoriesPage />} />
              <Route path="/repository/:repoId" element={<RepositoryViewPage />} />
              <Route path="/stars" element={<StarredRepositoriesPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile/:userId" element={<UserProfilePage />} />
              <Route path="/repository/:repoId/pulls" element={<RepositoryPullRequestsPage />} />
               <Route path="/organizations" element={<OrganizationListPage />} />
              <Route path="/organizations/new" element={<OrganizationCreatePage />} />
              <Route path="/organizations/:orgId" element={<OrganizationDetailPage />} />
            </Route>
            
            {/* Rută implicită - redirecționează spre login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
           </NotificationProvider> 
      </AuthProvider>
    </ChakraProvider>
  );
}

// Navbar-ul apare doar dacă utilizatorul este logat
const ConditionalNavbar: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navbar /> : null;
};

// Componenta pentru callback OAuth
const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUserData } = useAuth();
  
  React.useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(location.search);
      const accessToken = params.get('token');
      const refreshToken = params.get('refresh');
      
      if (accessToken && refreshToken) {
        try {
          // Folosește noul token manager pentru a salva tokens
          tokenManager.setTokens(accessToken, refreshToken);
          
          // Actualizează datele utilizatorului în context
          await refreshUserData();
          
          // Redirecționează către home
          navigate('/');
        } catch (error) {
          console.error('Error during OAuth callback:', error);
          navigate('/login');
        }
      } else {
        // Dacă nu avem tokens, redirecționează către login
        navigate('/login');
      }
    };

    handleOAuthCallback();
  }, [location, navigate, refreshUserData]);
  
  return <div>Authenticating...</div>;
};

export default App;