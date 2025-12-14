
import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Link } from 'lucide-react';
import { SyncService } from '../services/SyncService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
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

                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                            <h4 className="font-bold text-blue-900 mb-2">How to Connect Google Sheets?</h4>
                            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-2">
                                <li>Create a new Google Sheet.</li>
                                <li>Go to <b>Extensions &gt; Apps Script</b>.</li>
                                <li>Copy the code from <code>src/server/Code.js</code> in the project folder (or ask developer).</li>
                                <li>Paste it into the script editor.</li>
                                <li>Click <b>Deploy &gt; New Deployment</b>.</li>
                                <li>Select type <b>Web App</b>.</li>
                                <li>Set "Who has access" to <b>Anyone</b> (Important!).</li>
                                <li>Click Deploy and copy the <b>Web App URL</b> below.</li>
                            </ol>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Google App Script Web App URL</label>
                            <input
                                type="text"
                                value={scriptUrl}
                                onChange={(e) => setScriptUrl(e.target.value)}
                                placeholder="https://script.google.com/macros/s/..."
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition"
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
                </div>
            </div>
        </div>
    );
};
