import { useState, useEffect, useCallback } from 'react';
import { store } from '../store';

export function useSettings() {
  const [settings, setSettings] = useState({ vacation_mode: 'false' });
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await store.getSettings();
      const settingsMap = data.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
      setSettings(settingsMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleVacation = async (active) => {
    await store.toggleVacation(active);
    await fetchSettings();
  };

  const updateScoring = async (payload) => {
    await store.patchScoring(payload);
    await fetchSettings();
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, toggleVacation, updateScoring, refetch: fetchSettings };
}
