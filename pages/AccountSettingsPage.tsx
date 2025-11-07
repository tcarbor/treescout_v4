// pages/AccountSettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { Save, UserCircle, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { auth, db, ready } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getUserSettings, DEFAULT_SETTINGS, type Settings } from '../services/data';

const AccountSettingsPage: React.FC = () => {
  const [formData, setFormData] = useState<Settings>(DEFAULT_SETTINGS);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Resolve the Firestore doc path once auth is ready
  const getDocRef = () => {
    const uid = auth.currentUser?.uid || 'default';
    return doc(db, 'users', uid, 'settings', 'profile');
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await ready; // wait for Firebase init + anon sign-in
        const uid = auth.currentUser?.uid || 'default';
        const settings = await getUserSettings(uid); // falls back to settings/default if user doc not present
        setFormData(settings);
      } catch (err) {
        console.error('Failed to load settings:', err);
        setToast('Could not load settings (working offline?).');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const ref = getDocRef();
      await setDoc(ref, formData, { merge: true });
      setToast('Settings saved successfully!');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setToast('Save failed. Try again.');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <Link to="/clients" className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6 font-medium">
        <ChevronLeft className="w-5 h-5 mr-1" />
        Back to Dashboard
      </Link>

      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center">
            <UserCircle className="w-8 h-8 mr-3 text-gray-500" />
            Account Settings
          </h1>
          <p className="text-gray-500 mt-1">Update your personal and company information.</p>
        </div>

        <form onSubmit={handleSave}>
          <div className="p-6 space-y-4">
            {loading ? (
              <div className="text-gray-500">Loading…</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Your Name</label>
                    <input
                      type="text"
                      name="arboristName"
                      value={formData.arboristName}
                      onChange={handleChange}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Company Name</label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Digital Business Card URL</label>
                  <input
                    type="url"
                    name="digitalCardUrl"
                    value={formData.digitalCardUrl}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900"
                  />
                </div>
              </>
            )}
          </div>

          <div className="p-4 bg-gray-50 border-t flex justify-end items-center">
            {toast && <p className="text-sm text-green-600 mr-4">{toast}</p>}
            <button
              type="submit"
              disabled={loading || saving}
              className="flex items-center bg-green-600 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountSettingsPage;