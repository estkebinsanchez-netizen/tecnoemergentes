import { useState, useEffect, useCallback } from 'react';
import type { ConfiguracionUsuario } from '../types';
import { CONFIG_DEFAULT } from '../types';
import { loadConfig, saveConfig } from '../storage/database';

export function useConfig() {
  const [config, setConfig] = useState<ConfiguracionUsuario>(CONFIG_DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig().then((c) => {
      setConfig(c);
      setLoading(false);
    });
  }, []);

  const updateConfig = useCallback(async (updates: Partial<ConfiguracionUsuario>) => {
    const next = { ...config, ...updates };
    setConfig(next);
    await saveConfig(next);
  }, [config]);

  return { config, loading, updateConfig };
}
