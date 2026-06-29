import React, { useEffect } from 'react';
import { AppShell } from '../components/jarvis/AppShell';
import { useJarvisStore } from '../store/jarvisStore';

export default function JarvisHUD() {
  const { isConnected, setCpuUsage, setMemoryUsage } = useJarvisStore();

  useEffect(() => {
    const metricsInterval = setInterval(() => {
      if (isConnected) return;
      setCpuUsage(prev => {
        const last = prev[prev.length - 1] ?? 10;
        let next = last + (Math.random() * 20 - 10);
        next = Math.max(10, Math.min(95, next));
        return [...prev.slice(1), next];
      });
      setMemoryUsage(prev => {
        const last = prev[prev.length - 1] ?? 15;
        let next = last + (Math.random() * 10 - 5);
        next = Math.max(10, Math.min(95, next));
        return [...prev.slice(1), next];
      });
    }, 1000);

    return () => clearInterval(metricsInterval);
  }, [setCpuUsage, setMemoryUsage, isConnected]);

  return <AppShell />;
}
