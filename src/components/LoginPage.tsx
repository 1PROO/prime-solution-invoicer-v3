
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, KeyRound } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { USER_PASS } from '../constants/config';

export function LoginPage() {
    const { login } = useAuth();
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [showNameInput, setShowNameInput] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Check if password matches User Pass to show name input
        if (!showNameInput && password === USER_PASS) {
            setShowNameInput(true);
            return;
        }

        const success = await login(password, name);
        if (!success) {
            setError('Invalid password');
            if (showNameInput && !name) setError('Please enter your name');
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 transform transition-all">
                <div className="flex flex-col items-center mb-8">
                    <div className='bg-brand-500 rounded p-1 mb-4 h-16 w-16 items-center flex justify-center shadow-lg'>
                        <BrandLogo variant="light" className="scale-[0.8] origin-center" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
                    <p className="text-gray-500 text-sm">Sign in to access Prime Invoicer</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-2.5 text-gray-400" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (e.target.value !== USER_PASS) setShowNameInput(false);
                                }}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 outline-none transition"
                                placeholder="Enter access password"
                                autoFocus
                            />
                        </div>
                    </div>

                    {showNameInput && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 outline-none transition"
                                    placeholder="e.g. Mohamed"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="text-red-500 text-sm bg-red-50 p-2 rounded text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-lg transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                        <Lock size={18} />
                        {showNameInput ? 'Complete Login' : 'Login'}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gray-400">
                    Powered by Prime Solution
                </div>
            </div>
        </div>
    );
}
