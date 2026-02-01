'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

interface Settings {
  cronInterval: number;
  ollamaModel: string;
  lastSync: string | null;
  gmailConnected: boolean;
}

interface CronStatus {
  status: string;
  gmailConnected: boolean;
  ollamaConnected: boolean;
  lastRun: {
    timestamp: string;
    emails_processed: number;
    transactions_created: number;
    errors: number;
  } | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cronInterval, setCronInterval] = useState(5);
  const [ollamaModel, setOllamaModel] = useState('qwen2.5-coder:7b');

  const fetchSettings = async () => {
    try {
      const [settingsRes, cronRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/cron'),
      ]);
      const settingsData = await settingsRes.json();
      const cronData = await cronRes.json();

      setSettings(settingsData);
      setCronStatus(cronData);
      setCronInterval(settingsData.cronInterval);
      setOllamaModel(settingsData.ollamaModel);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cronInterval, ollamaModel }),
      });

      if (response.ok) {
        fetchSettings();
        alert('Settings saved');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const response = await fetch('/api/auth/gmail');
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Failed to get auth URL:', error);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-IN');
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-64 flex-1 p-8 min-h-screen">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-[#a1a1aa]">Configure your transaction tracker</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="spinner" />
            </div>
          ) : (
            <>
              {/* Service Status */}
              <div className="card mb-6">
                <h2 className="text-lg font-semibold mb-4">Service Status</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Gmail Connection</span>
                    <span className={`flex items-center gap-2 ${cronStatus?.gmailConnected ? 'text-green-400' : 'text-red-400'}`}>
                      {cronStatus?.gmailConnected ? '✓ Connected' : '✗ Not Connected'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Ollama</span>
                    <span className={`flex items-center gap-2 ${cronStatus?.ollamaConnected ? 'text-green-400' : 'text-red-400'}`}>
                      {cronStatus?.ollamaConnected ? '✓ Running' : '✗ Not Running'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last Sync</span>
                    <span className="text-[#a1a1aa]">{formatDate(settings?.lastSync || null)}</span>
                  </div>
                </div>
              </div>

              {/* Gmail Settings */}
              <div className="card mb-6">
                <h2 className="text-lg font-semibold mb-4">Gmail Connection</h2>
                {settings?.gmailConnected ? (
                  <div className="text-green-400 mb-4">✓ Gmail is connected</div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[#a1a1aa] text-sm">
                      Connect your Gmail account to automatically fetch transaction emails from Scapia.
                    </p>
                    <button onClick={handleConnectGmail} className="btn btn-primary">
                      Connect Gmail
                    </button>
                  </div>
                )}
              </div>

              {/* Sync Settings */}
              <div className="card mb-6">
                <h2 className="text-lg font-semibold mb-4">Sync Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#a1a1aa] mb-2">
                      Sync Interval (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={cronInterval}
                      onChange={(e) => setCronInterval(parseInt(e.target.value) || 5)}
                      className="input w-32"
                    />
                    <p className="text-xs text-[#666] mt-1">
                      How often to check for new transaction emails
                    </p>
                  </div>
                </div>
              </div>

              {/* Ollama Settings */}
              <div className="card mb-6">
                <h2 className="text-lg font-semibold mb-4">AI Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#a1a1aa] mb-2">
                      Ollama Model
                    </label>
                    <input
                      type="text"
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      className="input"
                      placeholder="qwen2.5-coder:7b"
                    />
                    <p className="text-xs text-[#666] mt-1">
                      The Ollama model used for transaction categorization
                    </p>
                  </div>
                </div>
              </div>

              {/* Last Run Stats */}
              {cronStatus?.lastRun && (
                <div className="card mb-6">
                  <h2 className="text-lg font-semibold mb-4">Last Sync Results</h2>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{cronStatus.lastRun.emails_processed}</div>
                      <div className="text-sm text-[#a1a1aa]">Emails Processed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-400">
                        {cronStatus.lastRun.transactions_created}
                      </div>
                      <div className="text-sm text-[#a1a1aa]">Transactions Created</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-400">
                        {cronStatus.lastRun.errors}
                      </div>
                      <div className="text-sm text-[#a1a1aa]">Errors</div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary w-full"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
