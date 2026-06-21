"use client";

import React, { useState } from 'react';
import { Download } from 'lucide-react';

type SaveChartButtonProps = {
  onExport: () => string | null;
};

const SaveChartButton: React.FC<SaveChartButtonProps> = ({ onExport }) => {
  const [status, setStatus] = useState<'idle' | 'downloaded' | 'failed'>('idle');

  const downloadSnapshot = () => {
    const image = onExport();
    if (!image || !image.startsWith('data:image/png')) {
      setStatus('failed');
      window.setTimeout(() => setStatus('idle'), 2200);
      return;
    }

    try {
      const anchor = document.createElement('a');
      anchor.href = image;
      anchor.download = `tokentrade-chart-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setStatus('downloaded');
      window.setTimeout(() => setStatus('idle'), 1800);
    } catch {
      setStatus('failed');
      window.setTimeout(() => setStatus('idle'), 2200);
    }
  };

  return (
    <button
      type="button"
      onClick={downloadSnapshot}
      className="inline-grid h-8 w-8 place-items-center rounded border border-[#2a2e39] bg-[#11151d] text-[#a7b1c2] hover:border-[#f0b90b] hover:text-white"
      title={
        status === 'downloaded'
          ? 'Snapshot downloaded'
          : status === 'failed'
            ? 'Download failed'
            : 'Download chart snapshot'
      }
    >
      <Download size={15} />
    </button>
  );
};

export default SaveChartButton;
