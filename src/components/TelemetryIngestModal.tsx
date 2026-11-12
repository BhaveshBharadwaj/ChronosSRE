import React, { useState } from 'react';
import { Upload, X, FileJson, Sparkles, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import { SAMPLE_CUSTOM_PROMETHEUS_JSON } from '../data/sreScenarios';

interface TelemetryIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngest: (rawJson: string) => { success: boolean; message: string };
  onReset: () => void;
}

export const TelemetryIngestModal: React.FC<TelemetryIngestModalProps> = ({
  isOpen,
  onClose,
  onIngest,
  onReset
}) => {
  const [jsonText, setJsonText] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonText(ev.target?.result as string);
      setStatusMsg(null);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setJsonText(SAMPLE_CUSTOM_PROMETHEUS_JSON);
    setStatusMsg({
      type: 'ok',
      text: 'Loaded sample Prometheus Multi-Window Fast-Burn payload (99.99% SLO tier). Click "Ingest Telemetry" below.'
    });
  };

  const handleSubmit = () => {
    if (!jsonText.trim()) {
      setStatusMsg({ type: 'err', text: 'Please paste or upload a Prometheus / SLO JSON payload first.' });
      return;
    }
    const res = onIngest(jsonText);
    if (res.success) {
      setStatusMsg({ type: 'ok', text: res.message });
      setTimeout(() => {
        onClose();
        setStatusMsg(null);
      }, 800);
    } else {
      setStatusMsg({ type: 'err', text: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-[#302a25] bg-[#1a1714] shadow-2xl overflow-hidden text-[#e6dfd5]">
        <div className="flex items-center justify-between border-b border-[#302a25] bg-[#24201c] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c89d66]/15 border border-[#c89d66]/40 text-[#dfc096]">
              <FileJson className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">
                Push Custom Prometheus / Alertmanager JSON
              </h3>
              <p className="text-xs text-[#a69d91]">
                Client-side evaluator for SLO Multi-Window Burn-Rate & Alertmanager webhook payloads
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[#a69d91] hover:bg-[#302a25] hover:text-[#e6dfd5] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="cursor-pointer inline-flex items-center gap-2 rounded-full border border-[#302a25] bg-[#24201c] px-4 py-2 text-xs font-medium text-[#e6dfd5] hover:border-[#c89d66] transition">
                <Upload className="h-3.5 w-3.5 text-[#c89d66]" />
                <span>Upload .JSON Artifact</span>
                <input type="file" accept=".json,application/json" onChange={handleFileUpload} className="hidden" />
              </label>

              <button
                type="button"
                onClick={handleLoadSample}
                className="inline-flex items-center gap-2 rounded-full border border-[#c89d66]/40 bg-[#c89d66]/10 px-4 py-2 text-xs font-medium text-[#dfc096] hover:bg-[#c89d66]/20 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Load 99.99% Fast-Burn Sample Payload
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onReset();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#302a25] bg-[#12100e] px-3.5 py-1.5 text-xs text-[#a69d91] hover:text-[#e6dfd5] transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Baseline Cluster
            </button>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={11}
            placeholder="Paste Prometheus Alertmanager JSON or SLO Burn-Rate telemetry here..."
            className="w-full rounded-xl border border-[#302a25] bg-[#12100e] p-4 font-mono text-xs text-[#e6dfd5] placeholder:text-[#a69d91]/50 focus:border-[#c89d66] focus:outline-none"
          />

          {statusMsg && (
            <div
              className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs ${
                statusMsg.type === 'ok'
                  ? 'border-[#7d9b76]/50 bg-[#7d9b76]/15 text-[#c5d9bf]'
                  : 'border-[#c96a52]/50 bg-[#c96a52]/15 text-[#f0b4a6]'
              }`}
            >
              {statusMsg.type === 'ok' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#7d9b76]" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#c96a52]" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#302a25] bg-[#24201c] px-6 py-4">
          <span className="text-xs font-mono text-[#a69d91]">
            100% Client-Side Execution • Zero Backend Dependencies
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-full border border-[#302a25] px-4 py-2 text-xs font-medium text-[#a69d91] hover:bg-[#302a25] hover:text-[#e6dfd5] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="rounded-full bg-[#c89d66] px-5 py-2 text-xs font-semibold text-[#12100e] hover:bg-[#dfc096] transition"
            >
              Ingest Telemetry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
