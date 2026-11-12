import { SreControlPlaneState, SloWindow } from '../types/sre';
import { BASELINE_SRE_STATE } from '../data/sreScenarios';

export function parseCustomSreJson(rawJson: string): {
  state: SreControlPlaneState;
  detectedType: string;
} {
  const parsed = JSON.parse(rawJson);

  // Format 1: ChronosSRE / Custom SLO bundle
  if (parsed && (parsed.clusterName || parsed.clusterMeta)) {
    const meta = parsed.clusterMeta || parsed;
    const windows: SloWindow[] = Array.isArray(parsed.sloWindows)
      ? parsed.sloWindows
      : BASELINE_SRE_STATE.sloWindows;

    return {
      state: {
        ...BASELINE_SRE_STATE,
        clusterMeta: {
          clusterName: meta.clusterName || 'custom-sre-cluster',
          region: meta.region || 'multi-region-ha',
          sloTargetPct: Number(meta.sloTargetPct ?? 99.95),
          rollingWindowDays: Number(meta.rollingWindowDays ?? 30),
          errorBudgetRemainingPct: Number(meta.errorBudgetRemainingPct ?? 64.5),
          currentP99Ms: Number(meta.currentP99Ms ?? 210),
          currentErrorRatePct: Number(meta.currentErrorRatePct ?? 0.08),
          releaseGate: meta.releaseGate === 'FROZEN_BY_SLO' ? 'FROZEN_BY_SLO' : 'OPEN',
          mttdAvgSeconds: Number(meta.mttdAvgSeconds ?? 16),
          mttrAvgSeconds: Number(meta.mttrAvgSeconds ?? 70)
        },
        sloWindows: windows
      },
      detectedType: `Prometheus SLO Payload (${meta.clusterName || 'custom-cluster'})`
    };
  }

  // Format 2: Standard Prometheus Alertmanager Webhook JSON (alerts[])
  if (parsed && Array.isArray(parsed.alerts)) {
    const firingCount = parsed.alerts.filter((a: any) => a.status === 'firing').length;
    const fastBurn = firingCount > 0 ? 15.2 : 0.6;
    return {
      state: {
        ...BASELINE_SRE_STATE,
        clusterMeta: {
          ...BASELINE_SRE_STATE.clusterMeta,
          clusterName: parsed.commonLabels?.cluster || 'alertmanager-webhook-cluster',
          errorBudgetRemainingPct: firingCount > 0 ? 48.0 : 91.0,
          currentP99Ms: firingCount > 0 ? 540 : 118,
          currentErrorRatePct: firingCount > 0 ? 1.85 : 0.01,
          releaseGate: firingCount > 0 ? 'FROZEN_BY_SLO' : 'OPEN'
        },
        sloWindows: [
          {
            window: '1h / 5m Fast-Burn Window',
            burnRate: fastBurn,
            threshold: 14.4,
            alertTier: firingCount > 0 ? 'PAGE_P1' : 'NONE',
            budgetConsumedPct: firingCount > 0 ? 28.4 : 1.2
          },
          ...BASELINE_SRE_STATE.sloWindows.slice(1)
        ]
      },
      detectedType: `Alertmanager Webhook (${parsed.alerts.length} alerts parsed)`
    };
  }

  throw new Error(
    'Unrecognized JSON schema. Expected ChronosSRE SLO payload or Prometheus Alertmanager webhook JSON (`alerts[]`).'
  );
}
