
import React, { createContext, useContext, useState, useEffect } from 'react';
import { SyncService } from '../services/SyncService';

interface User {
    name: string;
    role: 'admin' | 'user';
}

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<{ success: boolean; message?: string; suspended?: boolean }>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Check if running in Electron
    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron;

    const [user, setUser] = useState<User | null>(() => {
        // In Electron, auto-login as Admin
        if (isElectron) {
            return { name: 'Admin', role: 'admin' };
        }
        const saved = localStorage.getItem('prime_auth_user');
        return saved ? JSON.parse(saved) : null;
    });

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Don't persist to localStorage in Electron (always Admin)
        if (isElectron) return;

        if (user) {
            localStorage.setItem('prime_auth_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('prime_auth_user');
        }
    }, [user, isElectron]);

    const login = async (username: string, password: string) => {
        setIsLoading(true);

        try {
            const result = await SyncService.login(username, password);

            if (result.status === 'suspended') {
                setIsLoading(false);
                return {
                    success: false,
                    message: result.message || 'حسابك معطل حالياً. تواصل مع الدعم الفني.',
                    suspended: true
                };
            }

            if (result.status === 'success' && result.user) {
                setUser({
                    name: result.user.name,
                    role: result.user.role as 'admin' | 'user'
                });
                setIsLoading(false);
                return { success: true };
            }

            setIsLoading(false);
            return {
                success: false,
                message: result.message || 'فشل تسجيل الدخول'
            };
        } catch (e) {
            console.error("Login error", e);
            setIsLoading(false);
            return {
                success: false,
                message: 'فشل الاتصال بالسيرفر'
            };
        }
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
