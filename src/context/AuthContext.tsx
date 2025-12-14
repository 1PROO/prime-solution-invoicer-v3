
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ADMIN_PASS, USER_PASS } from '../constants/config';

interface User {
    name: string;
    role: 'admin' | 'user';
}

interface AuthContextType {
    user: User | null;
    login: (password: string, name?: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        const saved = localStorage.getItem('prime_auth_user');
        return saved ? JSON.parse(saved) : null;
    });

    useEffect(() => {
        if (user) {
            localStorage.setItem('prime_auth_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('prime_auth_user');
        }
    }, [user]);

    const login = async (password: string, name?: string) => {
        if (password === ADMIN_PASS) {
            setUser({ name: 'Admin', role: 'admin' });
            return true;
        }

        if (password === USER_PASS) {
            if (!name) return false;
            setUser({ name: name, role: 'user' });
            return true;
        }

        return false;
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
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
