
import React, { useState, useEffect } from 'react';
import { SyncService } from '../services/SyncService';
import { Users, UserPlus, UserX, Shield, Ban, Check, RefreshCw, Clock, Activity, Settings, Link, Save, AlertTriangle, X } from 'lucide-react';

interface UserData {
    username: string;
    role: 'admin' | 'user';
    status: 'active' | 'suspended';
    createdAt?: string;
}

interface ActivityLog {
    username: string;
    action: string;
    timestamp: string;
    details: string;
}

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'users' | 'activity' | 'config'>('users');
    const [users, setUsers] = useState<UserData[]>([]);
    const [activity, setActivity] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // New User Form
    const [showNewUserForm, setShowNewUserForm] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<'admin' | 'user'>('user');

    // Config
    const [scriptUrl, setScriptUrl] = useState(SyncService.getScriptUrl() || '');
    const [configSaved, setConfigSaved] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await SyncService.getUsers();
            setUsers(data);
        } catch (e) {
            setError('فشل تحميل المستخدمين');
        }
        setLoading(false);
    };

    const loadActivity = async () => {
        setLoading(true);
        try {
            const data = await SyncService.getActivity();
            setActivity(data);
        } catch (e) {
            console.error("Load activity failed", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (activeTab === 'users') loadUsers();
        if (activeTab === 'activity') loadActivity();
    }, [activeTab]);

    const handleCreateUser = async () => {
        if (!newUsername.trim() || !newPassword.trim()) {
            setError('الرجاء إدخال اسم المستخدم وكلمة المرور');
            return;
        }

        setLoading(true);
        const result = await SyncService.createUser({
            username: newUsername.trim(),
            password: newPassword,
            role: newRole
        });

        if (result.status === 'success') {
            setNewUsername('');
            setNewPassword('');
            setNewRole('user');
            setShowNewUserForm(false);
            await loadUsers();
        } else {
            setError(result.message || 'فشل إنشاء المستخدم');
        }
        setLoading(false);
    };

    const handleToggleStatus = async (username: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        setLoading(true);
        const result = await SyncService.updateUser({ username, status: newStatus });
        if (result.status === 'success') {
            await loadUsers();
        }
        setLoading(false);
    };

    const handleDeleteUser = async (username: string) => {
        if (!confirm(`هل أنت متأكد من حذف المستخدم "${username}"؟`)) return;

        setLoading(true);
        const success = await SyncService.deleteUser(username);
        if (success) {
            await loadUsers();
        }
        setLoading(false);
    };

    const handleSaveConfig = () => {
        SyncService.setScriptUrl(scriptUrl);
        setConfigSaved(true);
        setTimeout(() => setConfigSaved(false), 3000);
    };

    const formatDate = (isoString?: string) => {
        if (!isoString) return '-';
        const date = new Date(isoString);
        return date.toLocaleString('ar-EG', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto h-full overflow-y-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Settings className="text-brand-600" size={28} /> الإعدادات
                    </h1>
                    <p className="text-gray-500 text-sm">إدارة المستخدمين والنظام</p>
                </div>

                {/* Tab Navigation */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'users' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Users size={16} /> المستخدمين
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'activity' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Activity size={16} /> النشاط
                    </button>
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'config' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Link size={16} /> الإعدادات
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                    <AlertTriangle size={18} /> {error}
                    <button onClick={() => setError('')} className="ml-auto"><X size={16} /></button>
                </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2">
                            <Users size={20} className="text-brand-600" /> إدارة المستخدمين
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={loadUsers}
                                disabled={loading}
                                className="p-2 hover:bg-gray-200 rounded-lg transition text-gray-600"
                                title="تحديث"
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
                            <button
                                onClick={() => setShowNewUserForm(true)}
                                className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition flex items-center gap-2"
                            >
                                <UserPlus size={18} /> إضافة مستخدم
                            </button>
                        </div>
                    </div>

                    {/* Users List */}
                    <div className="divide-y divide-gray-100">
                        {users.length === 0 && !loading ? (
                            <div className="p-8 text-center text-gray-400">
                                لا يوجد مستخدمين
                            </div>
                        ) : (
                            users.map(user => (
                                <div key={user.username} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {user.role === 'admin' ? <Shield size={20} /> : <Users size={20} />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800">{user.username}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {user.role === 'admin' ? 'مسؤول' : 'مستخدم'}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {user.status === 'active' ? 'نشط' : 'معطل'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Toggle Status */}
                                        <button
                                            onClick={() => handleToggleStatus(user.username, user.status)}
                                            disabled={loading}
                                            className={`p-2 rounded-lg transition ${user.status === 'active' ? 'hover:bg-orange-50 text-orange-500' : 'hover:bg-green-50 text-green-500'}`}
                                            title={user.status === 'active' ? 'تعطيل' : 'تفعيل'}
                                        >
                                            {user.status === 'active' ? <Ban size={18} /> : <Check size={18} />}
                                        </button>

                                        {/* Delete */}
                                        <button
                                            onClick={() => handleDeleteUser(user.username)}
                                            disabled={loading}
                                            className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition"
                                            title="حذف"
                                        >
                                            <UserX size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2">
                            <Activity size={20} className="text-brand-600" /> سجل النشاط
                        </h2>
                        <button
                            onClick={loadActivity}
                            disabled={loading}
                            className="p-2 hover:bg-gray-200 rounded-lg transition text-gray-600"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                        {activity.length === 0 && !loading ? (
                            <div className="p-8 text-center text-gray-400">
                                لا يوجد نشاط مسجل
                            </div>
                        ) : (
                            activity.map((log, i) => (
                                <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                            <Clock size={16} className="text-gray-500" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-800">{log.username}</span>
                                            <span className="text-gray-500 text-sm mx-2">-</span>
                                            <span className={`text-sm ${log.action === 'login' ? 'text-green-600' : 'text-gray-600'}`}>
                                                {log.action === 'login' ? 'تسجيل دخول' : log.action}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400">{formatDate(log.timestamp)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Config Tab */}
            {activeTab === 'config' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Link size={20} className="text-brand-600" /> إعدادات الاتصال
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">رابط Google Apps Script</label>
                            <input
                                type="url"
                                value={scriptUrl}
                                onChange={(e) => setScriptUrl(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition"
                                placeholder="https://script.google.com/macros/s/..."
                                dir="ltr"
                            />
                            <p className="text-xs text-gray-500 mt-2">رابط الـ Web App من Google Apps Script</p>
                        </div>

                        <button
                            onClick={handleSaveConfig}
                            className="bg-brand-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-700 transition flex items-center gap-2"
                        >
                            <Save size={18} /> {configSaved ? 'تم الحفظ ✓' : 'حفظ الإعدادات'}
                        </button>
                    </div>
                </div>
            )}

            {/* New User Modal */}
            {showNewUserForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewUserForm(false)}></div>
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <UserPlus size={24} className="text-brand-600" /> إضافة مستخدم جديد
                                </h3>
                                <button onClick={() => setShowNewUserForm(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
                                    <input
                                        type="text"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                        placeholder="مثال: Mohamed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                        placeholder="كلمة مرور قوية"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الصلاحية</label>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setNewRole('user')}
                                            className={`flex-1 py-2 rounded-lg border-2 transition font-medium ${newRole === 'user' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                        >
                                            مستخدم عادي
                                        </button>
                                        <button
                                            onClick={() => setNewRole('admin')}
                                            className={`flex-1 py-2 rounded-lg border-2 transition font-medium ${newRole === 'admin' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                        >
                                            مسؤول
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCreateUser}
                                    disabled={loading}
                                    className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 transition flex items-center justify-center gap-2"
                                >
                                    {loading ? <RefreshCw size={18} className="animate-spin" /> : <UserPlus size={18} />}
                                    {loading ? 'جاري الإنشاء...' : 'إنشاء المستخدم'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
