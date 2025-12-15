
import React, { useState, useEffect } from 'react';
import { SyncService, UserData } from '../services/SyncService';
import { useAuth } from '../context/AuthContext';
import {
    Users, Activity, Globe, Shield, Save, Plus, Trash2,
    RefreshCw, Lock, Eye, EyeOff, AlertTriangle, Monitor,
    ChevronRight, ChevronLeft, LayoutDashboard, Database, Settings
} from 'lucide-react';

interface SettingsPageProps {
    appLanguage: 'ar' | 'en';
    setAppLanguage: (lang: 'ar' | 'en') => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ appLanguage, setAppLanguage }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'defaults' | 'activity'>('dashboard');

    // Data States
    const [users, setUsers] = useState<UserData[]>([]);
    const [activityLog, setActivityLog] = useState<any[]>([]);
    const [globalDefaults, setGlobalDefaults] = useState<any>({});

    // UI States
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Modals
    const [editingUser, setEditingUser] = useState<Partial<UserData> | null>(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        const [usrs, acts, defs] = await Promise.all([
            SyncService.getUsers(),
            SyncService.getActivity(),
            SyncService.getGlobalDefaults()
        ]);
        setUsers(usrs);
        setActivityLog(acts);
        setGlobalDefaults(defs);
        setLoading(false);
    };

    const showToast = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    // --- Handlers ---

    const handleSaveDefault = async (key: string, value: any) => {
        const newDefaults = { ...globalDefaults, [key]: value };
        setGlobalDefaults(newDefaults);
        await SyncService.saveGlobalDefaults({ [key]: value });
        showToast('success', appLanguage === 'ar' ? 'تم الحفظ' : 'Saved');
    };

    const handleCreateUser = async (userData: Partial<UserData>) => {
        setLoading(true);
        const res = await SyncService.createUser(userData);
        if (res.status === 'success') {
            showToast('success', 'User Created');
            setShowUserModal(false);
            loadAllData();
        } else {
            showToast('error', res.message || 'Error');
        }
        setLoading(false);
    };

    const handleUpdateUser = async (userData: Partial<UserData>) => {
        setLoading(true);
        const res = await SyncService.updateUser(userData);
        if (res.status === 'success') {
            showToast('success', 'User Updated');
            setEditingUser(null);
            loadAllData();
        } else {
            showToast('error', res.message || 'Error');
        }
        setLoading(false);
    };

    const handleDeleteUser = async (username: string) => {
        if (!confirm(appLanguage === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?')) return;
        setLoading(true);
        const success = await SyncService.deleteUser(username);
        if (success) {
            showToast('success', 'User Deleted');
            loadAllData();
        } else {
            showToast('error', 'Failed to delete');
        }
        setLoading(false);
    };

    // --- Renders ---

    const renderDashboard = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
                onClick={() => setActiveTab('users')}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition group"
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition">
                        <Users className="text-blue-600" size={24} />
                    </div>
                    <span className="text-2xl font-bold font-mono">{users.length}</span>
                </div>
                <h3 className="font-bold text-gray-700">{appLanguage === 'ar' ? 'المستخدمين' : 'Users'}</h3>
                <p className="text-sm text-gray-500 mt-1">{appLanguage === 'ar' ? 'إدارة الحسابات والصلاحيات' : 'Manage accounts & permissions'}</p>
            </div>

            <div
                onClick={() => setActiveTab('defaults')}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition group"
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition">
                        <Globe className="text-purple-600" size={24} />
                    </div>
                    <Settings className="text-gray-300" size={24} />
                </div>
                <h3 className="font-bold text-gray-700">{appLanguage === 'ar' ? 'إعدادات عامة' : 'Global Settings'}</h3>
                <p className="text-sm text-gray-500 mt-1">{appLanguage === 'ar' ? 'البيانات الافتراضية للفواتير' : 'Default invoice values'}</p>
            </div>

            <div
                onClick={() => setActiveTab('activity')}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition group"
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition">
                        <Activity className="text-orange-600" size={24} />
                    </div>
                    <span className="text-2xl font-bold font-mono">{activityLog.length}</span>
                </div>
                <h3 className="font-bold text-gray-700">{appLanguage === 'ar' ? 'سجل النشاط' : 'Activity Log'}</h3>
                <p className="text-sm text-gray-500 mt-1">{appLanguage === 'ar' ? 'متابعة دخول المستخدمين' : 'Track user logins'}</p>
            </div>
        </div>
    );

    const renderDefaultsTab = () => {
        const sellerInfo = globalDefaults['SELLER_INFO'] || { name: '', address: '', phone: '', email: '' };

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Monitor className="text-brand-600" /> {appLanguage === 'ar' ? 'لغة البرنامج' : 'App Language'}
                    </h3>
                    <div className="flex gap-4">
                        <button onClick={() => setAppLanguage('ar')} className={`flex-1 py-3 rounded-lg border font-bold ${appLanguage === 'ar' ? 'bg-brand-50 border-brand-500 text-brand-700' : 'border-gray-200 hover:bg-gray-50'}`}>العربية</button>
                        <button onClick={() => setAppLanguage('en')} className={`flex-1 py-3 rounded-lg border font-bold ${appLanguage === 'en' ? 'bg-brand-50 border-brand-500 text-brand-700' : 'border-gray-200 hover:bg-gray-50'}`}>English</button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Database className="text-brand-600" /> {appLanguage === 'ar' ? 'بيانات البائع الافتراضية' : 'Default Seller Info'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            className="input-field"
                            placeholder="Company Name"
                            value={sellerInfo.name}
                            onChange={(e) => handleSaveDefault('SELLER_INFO', { ...sellerInfo, name: e.target.value })}
                        />
                        <input
                            className="input-field"
                            placeholder="Address"
                            value={sellerInfo.address}
                            onChange={(e) => handleSaveDefault('SELLER_INFO', { ...sellerInfo, address: e.target.value })}
                        />
                        <input
                            className="input-field"
                            placeholder="Phone"
                            value={sellerInfo.phone}
                            onChange={(e) => handleSaveDefault('SELLER_INFO', { ...sellerInfo, phone: e.target.value })}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{appLanguage === 'ar' ? 'هذه البيانات ستظهر تلقائياً في الفواتير الجديدة.' : 'These details will auto-fill on new invoices.'}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-lg mb-4">{appLanguage === 'ar' ? 'الملاحظات الافتراضية (عربي)' : 'Default Notes (Arabic)'}</h3>
                    <textarea
                        className="input-field h-24"
                        value={globalDefaults['DEFAULT_NOTES_AR'] || ''}
                        onChange={(e) => handleSaveDefault('DEFAULT_NOTES_AR', e.target.value)}
                    />
                </div>
            </div>
        );
    };

    const renderUsersTab = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className='flex justify-between items-center'>
                <h2 className='font-bold text-2xl text-gray-800'>{appLanguage === 'ar' ? 'إدارة المستخدمين' : 'User Management'}</h2>
                <button
                    onClick={() => setShowUserModal(true)}
                    className='bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm transition'
                >
                    <Plus size={18} /> {appLanguage === 'ar' ? 'مستخدم جديد' : 'New User'}
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="p-4 font-bold text-gray-600 text-sm">{appLanguage === 'ar' ? 'المستخدم' : 'Username'}</th>
                            <th className="p-4 font-bold text-gray-600 text-sm">{appLanguage === 'ar' ? 'كلمة المرور' : 'Password'}</th>
                            <th className="p-4 font-bold text-gray-600 text-sm">{appLanguage === 'ar' ? 'الدور' : 'Role'}</th>
                            <th className="p-4 font-bold text-gray-600 text-sm">{appLanguage === 'ar' ? 'الحالة' : 'Status'}</th>
                            <th className="p-4 font-bold text-gray-600 text-sm text-right">{appLanguage === 'ar' ? 'إجراءات' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map((u) => (
                            <tr key={u.username} className="hover:bg-gray-50 transition">
                                <td className="p-4 font-medium text-gray-900">{u.username}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                            {showPassword[u.username] ? u.password : '••••••'}
                                        </span>
                                        <button onClick={() => setShowPassword(p => ({ ...p, [u.username]: !p[u.username] }))} className="text-gray-400 hover:text-brand-600">
                                            {showPassword[u.username] ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {u.status}
                                    </span>
                                </td>
                                <td className="p-4 flex gap-2 justify-end">
                                    {u.username !== 'Admin' && (
                                        <>
                                            <button
                                                onClick={() => setEditingUser(u)}
                                                className="text-gray-400 hover:text-blue-600 p-1"
                                            >
                                                <Settings size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u.username)}
                                                className="text-gray-400 hover:text-red-600 p-1"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // --- Modals ---

    const UserModal = () => {
        const isEdit = !!editingUser;
        const initialData = editingUser || { username: '', password: '', role: 'user', status: 'active', suspensionMessage: '' };
        const [formData, setFormData] = useState(initialData);

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
                    <h3 className="font-bold text-xl text-gray-800">{isEdit ? 'Edit User' : 'New User'}</h3>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Username</label>
                            <input
                                value={formData.username}
                                disabled={isEdit}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                className="input-field disabled:bg-gray-100"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
                            <input
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="input-field"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                    <option value="manager">Manager</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    className="input-field"
                                >
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                        </div>

                        {formData.status === 'suspended' && (
                            <div className="bg-red-50 p-3 rounded-lg border border-red-100 animate-in slide-in-from-top-2">
                                <label className="text-xs font-bold text-red-500 uppercase mb-1 block">Suspension Message</label>
                                <textarea
                                    value={formData.suspensionMessage}
                                    onChange={e => setFormData({ ...formData, suspensionMessage: e.target.value })}
                                    placeholder="Reason for suspension..."
                                    className="w-full text-sm p-2 rounded border border-red-200 focus:outline-none focus:border-red-400"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => { setShowUserModal(false); setEditingUser(null); }} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button
                            onClick={() => isEdit ? handleUpdateUser(formData) : handleCreateUser(formData)}
                            className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg shadow-sm"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className='min-h-screen bg-slate-50 p-6 relative pb-20'>
            {message && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg text-white font-bold animate-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {message.text}
                </div>
            )}

            {/* Breadcrumb Header */}
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500">
                    <button onClick={() => setActiveTab('dashboard')} className={`hover:text-brand-600 transition flex items-center gap-1 ${activeTab === 'dashboard' ? 'font-bold text-brand-600' : ''}`}>
                        <LayoutDashboard size={18} /> {appLanguage === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                    </button>
                    {activeTab !== 'dashboard' && (
                        <>
                            <ChevronRight size={16} />
                            <span className="font-bold text-gray-800 capitalize">{activeTab}</span>
                        </>
                    )}
                </div>
                {loading && <RefreshCw className="animate-spin text-brand-600" />}
            </div>

            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'users' && renderUsersTab()}
            {activeTab === 'defaults' && renderDefaultsTab()}
            {activeTab === 'activity' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3 text-left">User</th>
                                <th className="p-3 text-left">Action</th>
                                <th className="p-3 text-left">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activityLog.map((log, i) => (
                                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="p-3 font-bold">{log.username}</td>
                                    <td className="p-3">{log.action}</td>
                                    <td className="p-3 text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {(showUserModal || editingUser) && <UserModal />}

            <style>{`
        .input-field {
          width: 100%;
          padding: 0.5rem 0.75rem;
          background-color: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          outline: none;
          transition: all 0.2s;
        }
        .input-field:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
      `}</style>
        </div>
    );
};
