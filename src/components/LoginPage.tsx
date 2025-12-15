
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, KeyRound, AlertCircle, Loader2 } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export function LoginPage() {
    const { login, isLoading } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSuspended, setIsSuspended] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSuspended(false);

        if (!username.trim()) {
            setError('الرجاء إدخال اسم المستخدم');
            return;
        }

        if (!password.trim()) {
            setError('الرجاء إدخال كلمة المرور');
            return;
        }

        const result = await login(username.trim(), password);

        if (!result.success) {
            if (result.suspended) {
                setIsSuspended(true);
            }
            setError(result.message || 'فشل تسجيل الدخول');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 transform transition-all">
                <div className="flex flex-col items-center mb-8">
                    <div className='bg-brand-500 rounded p-1 mb-4 h-16 w-16 items-center flex justify-center shadow-lg'>
                        <BrandLogo variant="light" className="scale-[0.8] origin-center" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">مرحباً بك</h1>
                    <p className="text-gray-500 text-sm">سجّل الدخول للوصول إلى Prime Invoicer</p>
                </div>

                {/* Suspended Account Message */}
                {isSuspended && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center animate-in fade-in zoom-in-95 duration-300">
                        <AlertCircle className="mx-auto text-red-500 mb-2" size={40} />
                        <h3 className="text-red-700 font-bold mb-1">الحساب معطل</h3>
                        <p className="text-red-600 text-sm">{error}</p>
                        <div className="mt-3 pt-3 border-t border-red-200">
                            <p className="text-xs text-red-500">تواصل مع الدعم الفني لإعادة تفعيل حسابك</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
                                placeholder="مثال: Admin"
                                autoFocus
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-2.5 text-gray-400" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
                                placeholder="أدخل كلمة المرور"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {error && !isSuspended && (
                        <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg text-center flex items-center justify-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-bold py-3 rounded-lg transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                جاري تسجيل الدخول...
                            </>
                        ) : (
                            <>
                                <Lock size={18} />
                                تسجيل الدخول
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gray-400">
                    Powered by Prime Solution
                </div>
            </div>
        </div>
    );
}
