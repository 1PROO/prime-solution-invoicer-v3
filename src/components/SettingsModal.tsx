
import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Link, RotateCcw, Lock } from 'lucide-react';
import { SyncService } from '../services/SyncService';
import { DEFAULT_SCRIPT_URL } from '../constants/config';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    isAdmin: boolean;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, isAdmin }) => {
    const [scriptUrl, setScriptUrl] = useState('');
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    useEffect(() => {
        if (isOpen) {
            setScriptUrl(SyncService.getScriptUrl() || '');
            setTestStatus('idle');
        }
    }, [isOpen]);

    const handleSave = async () => {
        setTestStatus('testing');
        const isValid = await SyncService.validateConnection(scriptUrl);

        if (isValid) {
            SyncService.setScriptUrl(scriptUrl);
            setTestStatus('success');
            setTimeout(onClose, 1000);
        } else {
            setTestStatus('error');
        }
    };

    const handleReset = () => {
        if (confirm('Reset to default official URL?')) {
            setScriptUrl(DEFAULT_SCRIPT_URL);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Link size={24} className="text-brand-600" /> Connection Settings
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                    </div>

                    {!isAdmin ? (
                        <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-100">
                            <Lock className="mx-auto text-gray-400 mb-2" size={40} />
                            <h4 className="font-bold text-gray-700">Access Restricted</h4>
                            <p className="text-sm text-gray-500 mt-1">Only Administrators can change API configuration.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                                <h4 className="font-bold text-blue-900 mb-2">API Configuration (Admin)</h4>
                                <p className="text-sm text-blue-800">
                                    This URL connects the app to the Google Sheets backend.
                                    Do not change this unless you are deploying a new backend script.
                                </p>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-gray-700">Google App Script Web App URL</label>
                                    <button onClick={handleReset} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                                        <RotateCcw size={12} /> Reset to Default
                                    </button>
                                </div>

                                <input
                                    type="text"
                                    value={scriptUrl}
                                    onChange={(e) => setScriptUrl(e.target.value)}
                                    placeholder="https://script.google.com/macros/s/..."
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition font-mono text-sm"
                                />
                            </div>

                            <div className="flex justify-end items-center gap-4">
                                {testStatus === 'testing' && <span className="text-gray-500 text-sm flex items-center gap-2"><div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div> Testing...</span>}
                                {testStatus === 'success' && <span className="text-green-600 text-sm font-bold flex items-center gap-1"><Check size={16} /> Connected!</span>}
                                {testStatus === 'error' && <span className="text-red-600 text-sm font-bold flex items-center gap-1"><AlertTriangle size={16} /> Connection Failed</span>}

                                <button
                                    onClick={handleSave}
                                    disabled={testStatus === 'testing'}
                                    className="bg-brand-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-brand-700 transition disabled:opacity-50"
                                >
                                    Save & Connect
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

