"use client";

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useAppSelector } from '../../app/hooks';
import { API_URL } from '../../services/api';

type SaveChartButtonProps = {
  onExport: () => string | null;
};

const SaveChartButton: React.FC<SaveChartButtonProps> = ({ onExport }) => {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const drawings = useAppSelector((state) => state.drawings.drawings);
  const user = useAppSelector((state) => state.auth.user);
  const token = useAppSelector((state) => state.auth.token);

  const saveSnapshot = async () => {
    const image = onExport();
    if (!image) return;

    setStatus('saving');

    try {
      const response = await fetch(`${API_URL}/save-chart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: user?.id ?? user?._id ?? 'demo-user',
          image,
          drawings,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error(`Save failed: ${response.status}`);
      setStatus('saved');
      window.setTimeout(() => setStatus('idle'), 1800);
    } catch {
      setStatus('failed');
      window.setTimeout(() => setStatus('idle'), 2200);
    }
  };

  return (
    <button
      type="button"
      onClick={saveSnapshot}
      disabled={status === 'saving'}
      className="inline-grid h-8 w-8 place-items-center rounded border border-[#2a2e39] bg-[#11151d] text-[#a7b1c2] hover:border-[#f0b90b] hover:text-white disabled:cursor-wait disabled:opacity-70"
      title={status === 'saved' ? 'Snapshot saved' : status === 'failed' ? 'Save failed' : 'Save chart snapshot'}
    >
      {status === 'saving' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
    </button>
  );
};

export default SaveChartButton;
