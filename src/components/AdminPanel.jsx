import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, Activity, Users, Clock, Calendar,
    Search, Trash2, UserPlus, LogOut, FileText, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminPanel = () => {
    const { user, apiCall } = useAuth();
    const [activeTab, setActiveTab] = useState('audit'); // 'audit', 'sessions', 'users'

    return (
        <div className="p-4 md:p-8 w-full min-h-screen">
            <header className="mb-10">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent flex items-center gap-3">
                    <Shield className="text-red-500" size={42} />
                    Admin Control Center
                </h1>
                <p className="text-slate-400 mt-2 ml-14">Monitor system activity, manage access, and review audit logs.</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-white/10 pb-1 overflow-x-auto">
                <TabButton
                    id="audit"
                    label="Audit Logs"
                    icon={FileText}
                    active={activeTab === 'audit'}
                    onClick={() => setActiveTab('audit')}
                />
                <TabButton
                    id="sessions"
                    label="User Activity"
                    icon={Clock}
                    active={activeTab === 'sessions'}
                    onClick={() => setActiveTab('sessions')}
                />
                <TabButton
                    id="users"
                    label="User Management"
                    icon={Users}
                    active={activeTab === 'users'}
                    onClick={() => setActiveTab('users')}
                />
            </div>

            {/* Content Area */}
            <div className="glass-panel p-6 rounded-2xl min-h-[500px]">
                <AnimatePresence mode="wait">
                    {activeTab === 'audit' && <AuditLogView key="audit" apiCall={apiCall} />}
                    {activeTab === 'sessions' && <UserSessionsView key="sessions" apiCall={apiCall} />}
                    {activeTab === 'users' && <UserManagementView key="users" apiCall={apiCall} />}
                </AnimatePresence>
            </div>
        </div>
    );
};

const TabButton = ({ id, label, icon: Icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-medium transition-all relative ${active ? 'text-white bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
    >
        <Icon size={18} className={active ? 'text-red-400' : 'opacity-50'} />
        {label}
        {active && (
            <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"
            />
        )}
    </button>
);

// --- Sub-Components ---

const AuditLogView = ({ apiCall }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await apiCall('/api/audit-log');
                if (!res.ok) throw new Error('Failed to fetch audit logs');
                const data = await res.json();
                if (data.data) setLogs(data.data);
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [apiCall]);

    if (loading) return <div className="p-10 text-center text-slate-500">Loading audit logs...</div>;
    if (error) return <div className="p-10 text-center text-red-500">Error: {error}</div>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-400 uppercase tracking-wider">
                    <tr>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Resource</th>
                        <th className="px-4 py-3">IP Address</th>
                        <th className="px-4 py-3">Details</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {logs.map(log => (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-300">
                                {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 font-medium text-white">{log.username || 'Unknown'}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${log.action === 'DELETE' ? 'bg-red-500/20 text-red-400' :
                                    log.action === 'UPDATE' ? 'bg-orange-500/20 text-orange-400' :
                                        'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    {log.action}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400">{log.table_name || 'System'}</td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.ip_address}</td>
                            <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate" title={log.changes}>
                                {log.changes || '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const UserSessionsView = ({ apiCall }) => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const res = await apiCall('/api/user-sessions');
                const data = await res.json();
                if (data.data) setSessions(data.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSessions();
    }, [apiCall]);

    if (loading) return <div className="p-10 text-center text-slate-500">Loading activity data...</div>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-400 uppercase tracking-wider">
                    <tr>
                        <th className="px-4 py-3">Logged In</th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Duration</th>
                        <th className="px-4 py-3">Logged Out</th>
                        <th className="px-4 py-3">IP Address</th>
                        <th className="px-4 py-3">Device (User Agent)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {sessions.map(session => (
                        <tr key={session.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-300">
                                {new Date(session.login_time).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 font-medium text-white">{session.username || 'Unknown'}</td>
                            <td className="px-4 py-3 text-brand-orange font-bold">
                                {session.duration_minutes ? `${session.duration_minutes} min` : (
                                    <span className="text-emerald-400 animate-pulse">Active Now</span>
                                )}
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                                {session.logout_time ? new Date(session.logout_time).toLocaleTimeString() : '-'}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{session.ip_address}</td>
                            <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate" title={session.user_agent}>
                                {session.user_agent}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const UserManagementView = ({ apiCall }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [status, setStatus] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'user'
    });
    const [showPassword, setShowPassword] = useState(false);

    const fetchUsers = async () => {
        try {
            const res = await apiCall('/api/users');
            const data = await res.json();
            if (data.data) setUsers(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [apiCall]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const res = await apiCall('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                setStatus('User created successfully!');
                setFormData({ username: '', email: '', password: '', role: 'user' });
                setShowModal(false);
                fetchUsers();
                setTimeout(() => setStatus(''), 3000);
            } else {
                alert(data.error || 'Failed to create user');
            }
        } catch (err) {
            console.error(err);
            alert('Network error');
        }
    };

    const handleDeleteUser = async (id, username) => {
        if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;

        try {
            const res = await apiCall(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setStatus(`User "${username}" deleted.`);
                fetchUsers();
                setTimeout(() => setStatus(''), 3000);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete user');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to delete user');
        }
    };

    if (loading) return <div className="p-10 text-center text-slate-500">Loading users...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">System Users</h2>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-brand-orange hover:bg-orange-600 text-black font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition"
                >
                    <UserPlus size={18} />
                    Add New User
                </button>
            </div>

            {status && <div className="p-3 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 mb-4">{status}</div>}

            <div className="grid gap-4">
                {users.map(u => (
                    <div key={u.id} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:border-white/10 transition">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                <Users size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">{u.username}</h3>
                                <p className="text-sm text-slate-400">{u.role} • Last login: {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${u.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {u.is_active ? 'Active' : 'Inactive'}
                            </div>
                            <button
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Delete User"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="glass-panel w-full max-w-md p-8 rounded-2xl relative z-10 shadow-2xl border border-white/10"
                        >
                            <h2 className="text-2xl font-bold text-white mb-6">Create New User</h2>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Username</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full glass-input rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-brand-orange"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                                    <input
                                        type="email"
                                        className="w-full glass-input rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-brand-orange"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Role</label>
                                    <select
                                        className="w-full glass-input rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-brand-orange bg-slate-800"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            className="w-full glass-input rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-brand-orange pr-10"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3 text-slate-400 hover:text-white"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-slate-400 hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-brand-orange hover:bg-orange-600 text-black font-bold px-6 py-2 rounded-lg"
                                    >
                                        Create User
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};


export default AdminPanel;
