import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // Initialize state directly from localStorage to avoid race conditions
    const [token, setToken] = useState(localStorage.getItem('auth_token'));
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });

    // Sync with localStorage if needed, but direct init covers most cases
    useEffect(() => {
        const savedToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('user');
        if (savedToken) setToken(savedToken);
        if (savedUser) setUser(JSON.parse(savedUser));
    }, []);

    const login = async (username, password) => {
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                setUser(data.user);
                setToken(data.token);
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (err) {
            return { success: false, error: 'Network error' };
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
    };

    // Helper function to make authenticated API calls
    const apiCall = async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn("apiCall: No token available for", url);
        }

        console.log(`apiCall: Fetching ${url}, Token present: ${!!token}`);

        const response = await fetch(url, {
            ...options,
            headers
        });

        // Handle token expiration
        if (response.status === 403 || response.status === 401) {
            logout();
            throw new Error('Session expired. Please login again.');
        }

        return response;
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, apiCall }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
