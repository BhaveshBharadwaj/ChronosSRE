import React, { useState } from 'react';
import {
  Activity,
  Flame,
  ShieldAlert,
  CheckCircle2,
  Terminal,
  Server,
  Clock,
  FileJson,
  Play,
  RotateCcw,
  Lock,
  Unlock,
  Sliders,
  Download,
  Wrench,
  Layers
} from 'lucide-react';
import { BASELINE_SRE_STATE, CHAOS_SCENARIOS } from './data/sreScenarios';
import { SreControlPlaneState, ChaosFaultScenario } from './types/sre';
import { parseCustomSreJson } from './utils/sreTelemetryParser';
import { TelemetryIngestModal } from './components/TelemetryIngestModal';

export function App() {
  const [sreState, setSreState] = useState<SreControlPlaneState>(BASELINE_SRE_STATE);
  const [activeFault, setActiveFault] = useState<ChaosFaultScenario | null>(null);
  const [isRemediated, setIsRemediated] = useState<boolean>(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([
    '[CHRONOS-SRE] [12:30:00] Multi-AZ Kubernetes Topology verified across ap-south-1a, 1b, 1c (48/48 pods Ready).',
    '[SLO-ENGINE]  [12:30:02] Google SRE Multi-Window Burn-Rate Evaluator active (Target: 99.95% | 30d Budget: 86.4%).',
    '[RELEASE-GATE][12:30:04] Error budget healthy -> Production CI/CD deployment gate OPEN.'
  ]);
  const [sourceLabel, setSourceLabel] = useState<string>('Live Multi-AZ Telemetry');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Inject a Chaos Fault into the cluster
  const handleInjectFault = (scenario: ChaosFaultScenario) => {
    setActiveFault(scenario);
    setIsRemediated(false);
    setSourceLabel(`Chaos Experiment: ${scenario.id}`);

    const updatedZones = BASELINE_SRE_STATE.availabilityZones.map((zone) => {
      if (zone.az === scenario.affectedAz) {
        return {
          ...zone,
          status: 'CRITICAL_FAULT' as const,
          activePods: 10,
          cpuSaturation: 94,
          memSaturation: 91,
          trafficWeight: 8,
          workloads: zone.workloads.map((w, idx) => ({
            ...w,
            state: idx === 0 ? ('CrashLoopBackOff' as const) : ('OOMKilled' as const),
            restarts: idx === 0 ? 6 : 4,
            latencyP99Ms: scenario.simulatedP99Ms
          }))
        };
      }
      return {
        ...zone,
        status: 'DEGRADED' as const,
        cpuSaturation: 68,
        trafficWeight: 46
      };
    });

    setSreState({
      clusterMeta: {
        ...BASELINE_SRE_STATE.clusterMeta,
        errorBudgetRemainingPct: 58.2,
        currentP99Ms: scenario.simulatedP99Ms,
        currentErrorRatePct: scenario.simulatedErrorRatePct,
        releaseGate: 'FROZEN_BY_SLO',
        mttdAvgSeconds: scenario.mttdSeconds,
        mttrAvgSeconds: scenario.mttrSeconds
      },
      sloWindows: [
        {
          window: '1h / 5m Fast-Burn Window',
          burnRate: scenario.simulatedBurnRate1h,
          threshold: 14.4,
          alertTier: scenario.simulatedBurnRate1h >= 14.4 ? 'PAGE_P1' : 'TICKET_P3',
          budgetConsumedPct: 28.2
        },
        {
          window: '6h / 30m Medium-Burn Window',
          burnRate: scenario.simulatedBurnRate6h,
          threshold: 6.0,
          alertTier: 'PAGE_P1',
          budgetConsumedPct: 16.4
        },
        {
          window: '72h / 6h Slow-Burn Window',
          burnRate: 1.85,
          threshold: 1.0,
          alertTier: 'TICKET_P3',
          budgetConsumedPct: 8.1
        }
      ],
      availabilityZones: updatedZones
    });

    setTerminalLines(scenario.terminalLogs.slice(0, 3));
  };

  // Execute Automated SRE Runbook Remediation
  const handleExecuteRunbook = () => {
    if (!activeFault) return;
    setIsRemediated(true);
    setSourceLabel(`Auto-Remediated (${activeFault.runbookName.split(':')[0]})`);

    const healedZones = BASELINE_SRE_STATE.availabilityZones.map((zone) => {
      if (zone.az === activeFault.affectedAz) {
        return {
          ...zone,
          status: 'REMEDIATING' as const,
          activePods: 16,
          cpuSaturation: 48,
          memSaturation: 55,
          trafficWeight: 30,
          workloads: zone.workloads.map((w) => ({
            ...w,
            state: 'Running' as const,
            restarts: 0,
            latencyP99Ms: 122
          }))
        };
      }
      return {
        ...zone,
        status: 'HEALTHY' as const,
        trafficWeight: 35
      };
    });

    setSreState({
      clusterMeta: {
        ...BASELINE_SRE_STATE.clusterMeta,
        errorBudgetRemainingPct: 81.9,
        currentP99Ms: 124,
        currentErrorRatePct: 0.015,
        releaseGate: 'OPEN',
        mttdAvgSeconds: activeFault.mttdSeconds,
        mttrAvgSeconds: activeFault.mttrSeconds
      },
      sloWindows: [
        {
          window: '1h / 5m Fast-Burn Window',
          burnRate: 0.54,
          threshold: 14.4,
          alertTier: 'NONE',
          budgetConsumedPct: 1.4
        },
        {
          window: '6h / 30m Medium-Burn Window',
          burnRate: 0.72,
          threshold: 6.0,
          alertTier: 'NONE',
          budgetConsumedPct: 2.8
        },
        {
          window: '72h / 6h Slow-Burn Window',
          burnRate: 0.88,
          threshold: 1.0,
          alertTier: 'NONE',
          budgetConsumedPct: 9.2
        }
      ],
      availabilityZones: healedZones
    });

    setTerminalLines(activeFault.terminalLogs);
  };

  const handleResetBaseline = () => {
    setSreState(BASELINE_SRE_STATE);
    setActiveFault(null);
    setIsRemediated(false);
    setSourceLabel('Live Multi-AZ Telemetry');
    setTerminalLines([
      '[CHRONOS-SRE] [RESET] Cluster state restored to nominal multi-AZ steady state.',
      '[SLO-ENGINE]  [RESET] 1h Burn Rate: 0.42x | Error Budget Remaining: 86.4% | Release Gate: OPEN.'
    ]);
  };

  const handleCustomIngest = (rawJson: string): { success: boolean; message: string } => {
    try {
      const { state, detectedType } = parseCustomSreJson(rawJson);
      setSreState(state);
      setActiveFault(null);
      setIsRemediated(false);
      setSourceLabel(detectedType);
      setTerminalLines([
        `[JSON-INGEST] Successfully parsed custom telemetry: ${detectedType}`,
        `[SLO-ENGINE]  Evaluated cluster=${state.clusterMeta.clusterName} | p99=${state.clusterMeta.currentP99Ms}ms | ReleaseGate=${state.clusterMeta.releaseGate}`
      ]);
      return { success: true, message: `Loaded ${detectedType}` };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to parse JSON' };
    }
  };

  const handleExportSnapshot = () => {
    const blob = new Blob([JSON.stringify(sreState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronos-sre-snapshot-${sreState.clusterMeta.clusterName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#12100e] text-[#e6dfd5] flex flex-col">
      {/* Top Bar — Warm Analog Espresso & Ochre Brass */}
      <header className="sticky top-0 z-30 border-b border-[#302a25] bg-[#12100e]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c89d66]/45 bg-[#24201c] text-[#dfc096]">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold tracking-tight text-[#e6dfd5]">ChronosSRE</h1>
                <span className="rounded-full border border-[#c89d66]/40 bg-[#c89d66]/10 px-2.5 py-0.5 font-mono text-[11px] text-[#dfc096]">
                  v2.1 • Reliability Control Plane
                </span>
              </div>
              <p className="text-xs text-[#a69d91]">
                Multi-Window SLO Burn-Rate Engine, Failure Domain Topology & Chaos Auto-Remediation
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="hidden md:flex items-center gap-2 rounded-full border border-[#302a25] bg-[#1a1714] px-3.5 py-1.5 text-xs font-mono text-[#a69d91]">
              <span className="h-2 w-2 rounded-full bg-[#7d9b76]" />
              <span>{sourceLabel}</span>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#c89d66] px-4 py-2 text-xs font-semibold text-[#12100e] hover:bg-[#dfc096] transition"
            >
              <FileJson className="h-4 w-4" />
              <span>Push Prometheus / SLO JSON</span>
            </button>

            <button
              onClick={handleExportSnapshot}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#302a25] bg-[#1a1714] px-3.5 py-2 text-xs font-medium text-[#e6dfd5] hover:border-[#c89d66] transition"
            >
              <Download className="h-3.5 w-3.5 text-[#c89d66]" />
              <span className="hidden sm:inline">Export State</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 space-y-8">
        {/* Cluster Metadata & CI/CD Release Gate Banner */}
        <section className="rounded-2xl border border-[#302a25] bg-[#1a1714] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs text-[#a69d91]">
                <span>KUBERNETES CONTROL PLANE</span>
                <span>•</span>
                <span className="text-[#dfc096]">{sreState.clusterMeta.region}</span>
              </div>
              <h2 className="mt-1 text-xl font-semibold text-[#e6dfd5] flex items-center gap-3">
                <span>{sreState.clusterMeta.clusterName}</span>
                <span className="rounded-full border border-[#302a25] bg-[#24201c] px-3 py-0.5 font-mono text-xs text-[#dfc096]">
                  SLO Target: {sreState.clusterMeta.sloTargetPct}%
                </span>
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-mono font-semibold ${
                  sreState.clusterMeta.releaseGate === 'OPEN'
                    ? 'border-[#7d9b76]/50 bg-[#7d9b76]/15 text-[#c5d9bf]'
                    : 'border-[#c96a52]/60 bg-[#c96a52]/20 text-[#f0b4a6]'
                }`}
              >
                {sreState.clusterMeta.releaseGate === 'OPEN' ? (
                  <>
                    <Unlock className="h-3.5 w-3.5 text-[#7d9b76]" />
                    <span>CI/CD RELEASE GATE: OPEN</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5 text-[#c96a52]" />
                    <span>CI/CD RELEASE GATE: FROZEN BY SLO BURN</span>
                  </>
                )}
              </div>

              {activeFault && (
                <button
                  onClick={handleResetBaseline}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#302a25] bg-[#24201c] px-3.5 py-1.5 text-xs text-[#e6dfd5] hover:border-[#c89d66] transition"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#c89d66]" />
                  <span>Reset Steady State</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 4 Core SRE Golden Signal Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#302a25] bg-[#1a1714] p-5">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-[#a69d91]">
              <span>30d Error Budget Remaining</span>
              <Sliders className="h-4 w-4 text-[#c89d66]" />
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-mono text-3xl font-bold text-[#dfc096]">
                {sreState.clusterMeta.errorBudgetRemainingPct.toFixed(1)}%
              </span>
              <span className="rounded-full border border-[#302a25] bg-[#24201c] px-2.5 py-0.5 font-mono text-[11px] text-[#a69d91]">
                21.6m / 25m left
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-[#12100e] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#c89d66] transition-all duration-500"
                style={{ width: `${Math.min(100, sreState.clusterMeta.errorBudgetRemainingPct)}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#302a25] bg-[#1a1714] p-5">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-[#a69d91]">
              <span>Tail Latency (p99)</span>
              <Activity className="h-4 w-4 text-[#c89d66]" />
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span
                className={`font-mono text-3xl font-bold ${
                  sreState.clusterMeta.currentP99Ms > 300 ? 'text-[#c96a52]' : 'text-[#e6dfd5]'
                }`}
              >
                {sreState.clusterMeta.currentP99Ms} ms
              </span>
              <span className="font-mono text-xs text-[#a69d91]">SLI Threshold &lt; 250ms</span>
            </div>
            <p className="mt-2 text-xs text-[#a69d91]">
              5xx Error Rate: <strong className="font-mono text-[#e6dfd5]">{sreState.clusterMeta.currentErrorRatePct}%</strong>
            </p>
          </div>

          <div className="rounded-2xl border border-[#302a25] bg-[#1a1714] p-5">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-[#a69d91]">
              <span>1h Fast-Burn Multiplier</span>
              <Flame className="h-4 w-4 text-[#c96a52]" />
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span
                className={`font-mono text-3xl font-bold ${
                  sreState.sloWindows[0].burnRate >= 14.4 ? 'text-[#c96a52]' : 'text-[#7d9b76]'
                }`}
              >
                {sreState.sloWindows[0].burnRate.toFixed(2)}x
              </span>
              <span className="rounded-full border border-[#302a25] bg-[#24201c] px-2.5 py-0.5 font-mono text-[11px] text-[#dfc096]">
                Page @ 14.4x
              </span>
            </div>
            <p className="mt-2 text-xs text-[#a69d91]">
              Google SRE multi-window alerting formula
            </p>
          </div>

          <div className="rounded-2xl border border-[#302a25] bg-[#1a1714] p-5">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-[#a69d91]">
              <span>MTTD / MTTR Velocity</span>
              <Clock className="h-4 w-4 text-[#7d9b76]" />
            </div>
            <div className="mt-4 flex items-baseline gap-3 font-mono">
              <span className="text-2xl font-bold text-[#e6dfd5]">{sreState.clusterMeta.mttdAvgSeconds}s</span>
              <span className="text-xs text-[#a69d91]">MTTD</span>
              <span className="text-2xl font-bold text-[#dfc096] ml-2">{sreState.clusterMeta.mttrAvgSeconds}s</span>
              <span className="text-xs text-[#a69d91]">MTTR</span>
            </div>
            <p className="mt-2 text-xs text-[#a69d91]">
              Deterministic runbook auto-remediation
            </p>
          </div>
        </section>

        {/* Interactive Chaos Engineering Workbench & Auto-Remediation Trigger */}
        <section className="rounded-2xl border border-[#302a25] bg-[#1a1714] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-[#e6dfd5] flex items-center gap-2">
                <Flame className="h-4 w-4 text-[#c89d66]" />
                <span>Chaos Engineering Fault Injector & Runbook Auto-Remediation</span>
              </h3>
              <p className="text-xs text-[#a69d91]">
                Select a failure mode below to simulate a production incident, trip SLO burn-rate alerts, and execute automated Kubernetes runbooks
              </p>
            </div>

            {activeFault && !isRemediated && (
              <button
                onClick={handleExecuteRunbook}
                className="inline-flex items-center gap-2 rounded-full bg-[#7d9b76] px-5 py-2.5 text-xs font-semibold text-[#12100e] hover:bg-[#93b38c] transition shadow-md"
              >
                <Wrench className="h-4 w-4" />
                <span>Execute Auto-Remediation Runbook ({activeFault.runbookName.split(':')[0]})</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {CHAOS_SCENARIOS.map((scenario) => {
              const isSelected = activeFault?.id === scenario.id;
              return (
                <div
                  key={scenario.id}
                  className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                    isSelected
                      ? 'border-[#c89d66] bg-[#24201c]'
                      : 'border-[#302a25] bg-[#12100e]/70 hover:border-[#c89d66]/50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="rounded-full border border-[#302a25] bg-[#1a1714] px-2.5 py-0.5 text-[#dfc096]">
                        {scenario.category}
                      </span>
                      <span className="text-[#a69d91]">Target: {scenario.affectedAz}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-[#e6dfd5]">{scenario.title}</h4>
                    <p className="text-xs text-[#a69d91] leading-relaxed">{scenario.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#302a25] flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[#a69d91]">
                      Simulated Burn: <strong className="text-[#c96a52]">{scenario.simulatedBurnRate1h}x</strong>
                    </span>
                    <button
                      onClick={() => handleInjectFault(scenario)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#c89d66]/15 border border-[#c89d66]/50 px-3.5 py-1.5 text-xs font-semibold text-[#dfc096] hover:bg-[#c89d66] hover:text-[#12100e] transition"
                    >
                      <Play className="h-3 w-3" />
                      <span>Inject Fault</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Runbook Steps Display */}
          {activeFault && (
            <div className="rounded-xl border border-[#302a25] bg-[#12100e] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-[#c89d66]" />
                  <span className="text-xs font-mono font-semibold text-[#dfc096]">
                    ACTIVE PLAYBOOK: {activeFault.runbookName}
                  </span>
                </div>
                <span
                  className={`rounded-full px-3 py-0.5 font-mono text-[11px] font-semibold ${
                    isRemediated
                      ? 'bg-[#7d9b76]/20 text-[#c5d9bf] border border-[#7d9b76]/50'
                      : 'bg-[#c96a52]/20 text-[#f0b4a6] border border-[#c96a52]/50'
                  }`}
                >
                  {isRemediated ? 'REMEDIATION VERIFIED' : 'FAULT ACTIVE — AWAITING RUNBOOK'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {activeFault.remediationSteps.map((s) => (
                  <div key={s.step} className="rounded-xl border border-[#302a25] bg-[#1a1714] p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#dfc096] font-semibold">STEP 0{s.step}</span>
                      {isRemediated && <CheckCircle2 className="h-3.5 w-3.5 text-[#7d9b76]" />}
                    </div>
                    <p className="text-xs font-medium text-[#e6dfd5]">{s.action}</p>
                    <code className="block rounded-lg bg-[#12100e] p-2 font-mono text-[11px] text-[#dfc096] overflow-x-auto">
                      {s.command}
                    </code>
                    <p className="text-[11px] text-[#a69d91]">{s.verification}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Embedded SRE Incident & Remediation Terminal */}
          <div className="rounded-xl border border-[#302a25] bg-[#12100e] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#302a25] bg-[#24201c] px-4 py-2.5 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-[#c89d66]" />
                <span className="text-[#e6dfd5] font-semibold">Live SRE Control Plane & Runbook Stream</span>
              </div>
              <span className="text-[#a69d91]">Alertmanager + kubectl controller</span>
            </div>
            <div className="p-4 font-mono text-xs space-y-1.5">
              {terminalLines.map((line, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className="text-[#a69d91]/50 select-none mr-3">{idx + 1}</span>
                  <span
                    className={
                      line.includes('[RECOVERY]') || line.includes('READY')
                        ? 'text-[#c5d9bf]'
                        : line.includes('ALERT') || line.includes('OOMKilled') || line.includes('loss=92%')
                        ? 'text-[#f0b4a6]'
                        : 'text-[#e6dfd5]'
                    }
                  >
                    {line}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Multi-AZ Kubernetes Failure Domain Topology & Multi-Window SLO Table */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left 2 Columns: Multi-AZ Failure Domains */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#e6dfd5] flex items-center gap-2">
                <Server className="h-4 w-4 text-[#c89d66]" />
                <span>Multi-AZ Kubernetes Failure Domain Topology</span>
              </h3>
              <span className="font-mono text-xs text-[#a69d91]">
                topologySpreadConstraints: maxSkew=1
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {sreState.availabilityZones.map((zone) => (
                <div
                  key={zone.az}
                  className={`rounded-2xl border p-4 space-y-3.5 ${
                    zone.status === 'CRITICAL_FAULT'
                      ? 'border-[#c96a52] bg-[#c96a52]/10'
                      : 'border-[#302a25] bg-[#1a1714]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#dfc096]">{zone.az}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
                        zone.status === 'CRITICAL_FAULT'
                          ? 'bg-[#c96a52]/30 text-[#f0b4a6] border border-[#c96a52]/60'
                          : 'bg-[#7d9b76]/20 text-[#c5d9bf] border border-[#7d9b76]/40'
                      }`}
                    >
                      {zone.status}
                    </span>
                  </div>

                  <div className="text-xs text-[#a69d91] font-mono space-y-1">
                    <div className="flex justify-between">
                      <span>Ready Pods:</span>
                      <span className="text-[#e6dfd5]">
                        {zone.activePods}/{zone.desiredPods}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Envoy Traffic Weight:</span>
                      <span className="text-[#dfc096]">{zone.trafficWeight}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PDB Quorum:</span>
                      <span className="text-[#e6dfd5]">{zone.pdbMinAvailable}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-[#302a25]">
                    {zone.workloads.map((wl) => (
                      <div
                        key={wl.name}
                        className="rounded-lg bg-[#12100e] px-2.5 py-2 text-[11px] font-mono flex items-center justify-between"
                      >
                        <span className="truncate text-[#e6dfd5]">{wl.name}</span>
                        <span
                          className={
                            wl.state === 'Running' ? 'text-[#7d9b76]' : 'text-[#c96a52] font-semibold'
                          }
                        >
                          {wl.state}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Google SRE Multi-Window Burn-Rate Evaluator */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#e6dfd5] flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#c89d66]" />
                <span>Multi-Window Burn-Rate Matrix</span>
              </h3>
            </div>

            <div className="rounded-2xl border border-[#302a25] bg-[#1a1714] p-4 space-y-3">
              {sreState.sloWindows.map((win) => (
                <div
                  key={win.window}
                  className="rounded-xl border border-[#302a25] bg-[#12100e] p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#e6dfd5]">{win.window}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
                        win.alertTier === 'PAGE_P1'
                          ? 'bg-[#c96a52]/25 text-[#f0b4a6] border border-[#c96a52]/50'
                          : win.alertTier === 'TICKET_P3'
                          ? 'bg-[#c89d66]/20 text-[#dfc096] border border-[#c89d66]/50'
                          : 'bg-[#7d9b76]/20 text-[#c5d9bf] border border-[#7d9b76]/40'
                      }`}
                    >
                      {win.alertTier}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between font-mono text-xs">
                    <span className="text-[#a69d91]">
                      Burn Rate: <strong className="text-[#dfc096]">{win.burnRate}x</strong> (Limit: {win.threshold}x)
                    </span>
                    <span className="text-[#a69d91]">{win.budgetConsumedPct}% budget</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#302a25] bg-[#12100e] py-6 px-6 text-xs text-[#a69d91]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 font-mono">
          <div>ChronosSRE — Autonomous Site Reliability Engineering & Chaos Control Plane</div>
          <div>Zero-Cost Static Architecture • Ready for GitHub Pages & Vercel</div>
        </div>
      </footer>

      <TelemetryIngestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onIngest={handleCustomIngest}
        onReset={handleResetBaseline}
      />
    </div>
  );
}

export default App;
