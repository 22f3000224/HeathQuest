import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import SanctuaryCreation from './pages/SanctuaryCreation'
import SanctuaryWorld from './pages/SanctuaryWorld'
import CompanionScreen from './pages/CompanionScreen'
import DailyLog from './pages/DailyLog'
import DailyLogCompleted from './pages/DailyLogCompleted'
import MuseumOfProgress from './pages/MuseumOfProgress'
import ChronicleScreen from './pages/ChronicleScreenNew'
import StorybookScreen from './pages/StorybookScreen'
import LoginScreen from './pages/LoginScreen'
import ErrorBoundary from './ErrorBoundary'
import { useAuthStore } from './store/useAuthStore'
import { useSanctuaryStore } from './store/useSanctuaryStore'
import './pages/LandingPage.css'

// Protected Route component
function ProtectedRoute({ children, requireSetup = false }) {
  const { isAuthenticated } = useAuthStore();
  const { companion, loading } = useSanctuaryStore(s => ({
    companion: s.companion,
    loading: s.loading
  }));
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  // Show loading while sanctuary data is being fetched
  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0810'}}>
        <div style={{color: '#f0e8d0', fontFamily: 'Cinzel, serif'}}>Loading sanctuary...</div>
      </div>
    );
  }
  
  // Simplified check: if user has companion, they've completed setup
  const hasCompletedSetup = !!companion;
  
  // If this route requires setup but user hasn't completed it
  if (requireSetup && !hasCompletedSetup) {
    return <Navigate to="/sanctuary-creation" replace />;
  }
  
  return children;
}

// Public Route component (redirect to sanctuary if authenticated)
function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  const { companion, loading } = useSanctuaryStore(s => ({
    companion: s.companion,
    loading: s.loading
  }));
  
  console.log('📋 PublicRoute - isAuthenticated:', isAuthenticated, 'companion:', companion, 'loading:', loading);
  
  if (!isAuthenticated) return children;
  
  // Show loading while checking user state
  if (loading) {
    console.log('⏳ PublicRoute - showing loading screen');
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0810'}}>
        <div style={{color: '#f0e8d0', fontFamily: 'Cinzel, serif'}}>Checking user state...</div>
      </div>
    );
  }
  
  // Simplified logic: companion = existing user, no companion = new user
  const hasCompletedSetup = !!companion;
  console.log('🧪 PublicRoute decision - hasCompletedSetup:', hasCompletedSetup, 'going to:', hasCompletedSetup ? 'sanctuaryworld' : 'sanctuary-creation');
  
  return hasCompletedSetup ? 
    <Navigate to="/sanctuaryworld" replace /> : 
    <Navigate to="/sanctuary-creation" replace />;
}

export default function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();
  const { initializeSanctuary } = useSanctuaryStore();
  const [appInitialized, setAppInitialized] = React.useState(false);
  const [sanctuaryInitialized, setSanctuaryInitialized] = React.useState(false);

  // Check authentication on app load
  useEffect(() => {
    const initApp = async () => {
      await checkAuth();
      setAppInitialized(true);
    };
    initApp();
  }, [checkAuth]);

  // Initialize sanctuary data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && appInitialized && !sanctuaryInitialized) {
      console.log('🔄 Initializing sanctuary from backend...');
      initializeSanctuary().then(() => {
        console.log('✅ Sanctuary initialization complete');
        setSanctuaryInitialized(true);
      }).catch(err => {
        console.error('❌ Sanctuary initialization failed:', err);
        setSanctuaryInitialized(true); // Still allow routing to prevent infinite loading
      });
    }
  }, [isAuthenticated, appInitialized, sanctuaryInitialized, initializeSanctuary]);

  // Reset sanctuary initialization when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setSanctuaryInitialized(false);
    }
  }, [isAuthenticated]);

  // Show loading until app AND sanctuary are initialized
  if (!appInitialized || (isAuthenticated && !sanctuaryInitialized)) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0810'}}>
        <div style={{color: '#f0e8d0', fontFamily: 'Cinzel, serif'}}>
          {!appInitialized ? 'Initializing HealthQuest...' : 'Loading sanctuary data...'}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={
          <PublicRoute>
            <LandingPage />
          </PublicRoute>
        } />
        <Route path="/login" element={
          <PublicRoute>
            <LoginScreen />
          </PublicRoute>
        } />
        <Route path="/sanctuary-creation" element={
          <ProtectedRoute>
            <SanctuaryCreation />
          </ProtectedRoute>
        } />
        <Route path="/sanctuary" element={
          <ProtectedRoute>
            <SanctuaryCreation />
          </ProtectedRoute>
        } />
        <Route path="/sanctuaryworld" element={
          <ProtectedRoute requireSetup>
            <SanctuaryWorld />
          </ProtectedRoute>
        } />
        <Route path="/companion" element={
          <ProtectedRoute>
            <CompanionScreen />
          </ProtectedRoute>
        } />
        <Route path="/dailylog" element={
          <ProtectedRoute>
            <DailyLog />
          </ProtectedRoute>
        } />
        <Route path="/dailylog-completed" element={
          <ProtectedRoute>
            <DailyLogCompleted />
          </ProtectedRoute>
        } />
        <Route path="/museum" element={
          <ProtectedRoute>
            <MuseumOfProgress />
          </ProtectedRoute>
        } />
        <Route path="/chronicle" element={
          <ProtectedRoute>
            <ChronicleScreen />
          </ProtectedRoute>
        } />
        <Route path="/storybook" element={
          <ProtectedRoute>
            <StorybookScreen />
          </ProtectedRoute>
        } />
      </Routes>
    </ErrorBoundary>
  )
}
