import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';

const Layout = ({ children, view, setView, logout, user }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    return (
        <div className="flex bg-ocean-dark h-screen relative overflow-hidden">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 w-full bg-slate-900 border-b border-slate-700 z-50 px-4 py-3 flex justify-between items-center shadow-md">
                <span className="text-xl font-bold text-brand-orange tracking-wider">MPM</span>
                <button
                    onClick={toggleMobileMenu}
                    className="text-slate-200 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar Wrapper */}
            <div className={`
                fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:flex
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <Sidebar
                    view={view}
                    setView={(newView) => {
                        setView(newView);
                        closeMobileMenu();
                    }}
                    logout={logout}
                    user={user}
                    onClose={closeMobileMenu} // Pass close handler for mobile
                />
            </div>

            {/* Overlay for Mobile */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
                    onClick={closeMobileMenu}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 w-full h-full lg:ml-0 pt-16 lg:pt-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {children}
            </main>
        </div>
    );
};

export default Layout;
