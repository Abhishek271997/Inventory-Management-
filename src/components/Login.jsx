import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

const Login = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulating a network delay for "Formal" feel
        setTimeout(async () => {
            const res = await login(username, password);
            if (!res.success) {
                setError(res.error);
                setIsLoading(false);
            }
        }, 800);
    };

    return (
        <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md z-10 p-8"
            >
                <div className="glass-panel p-10 rounded-2xl border border-white/10 shadow-2xl relative">
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 bg-gradient-to-tr from-brand-orange to-amber-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-orange-500/20 mb-6">
                            <Lock className="text-white" size={32} />
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h2>
                        <p className="text-slate-400 mt-2 text-sm">Sign in to access the MPM Inventory System</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2"
                        >
                            <AlertCircle size={16} />
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Username</label>
                            <div className="relative group">
                                <User className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-brand-orange transition-colors" size={20} />
                                <input
                                    type="text"
                                    className="w-full glass-input rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-brand-orange/50 transition-all font-medium"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-brand-orange transition-colors" size={20} />
                                <input
                                    type="password"
                                    className="w-full glass-input rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-brand-orange/50 transition-all font-medium"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-brand-orange to-orange-600 hover:to-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Sign In to Dashboard</span>
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </motion.button>


                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
