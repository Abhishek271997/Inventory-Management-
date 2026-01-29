import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MaintenanceForm from './components/MaintenanceForm';
import MaintenanceLogs from './components/MaintenanceLogs';
import MaintenanceAnalytics from './components/MaintenanceAnalytics';

import AdminPanel from './components/AdminPanel';
import Sidebar from './components/Sidebar';
import Layout from './components/Layout';
import InstallPrompt from './components/InstallPrompt';

const AppContent = () => {
    const { user, logout } = useAuth();
    const [view, setView] = useState('dashboard');
    const [logsParams, setLogsParams] = useState({});

    if (!user) {
        return <Login />;
    }

    return (
        <Layout view={view} setView={setView} logout={logout} user={user}>
            {view === 'dashboard' && <Dashboard setView={setView} />}
            {view === 'form' && <MaintenanceForm />}
            {view === 'logs' && <MaintenanceLogs initialParams={logsParams} setView={setView} />}
            {view === 'analytics-maintenance' && <MaintenanceAnalytics setView={setView} setLogsParams={setLogsParams} />}

            {view === 'admin' && <AdminPanel />}
            <InstallPrompt />
        </Layout>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;
