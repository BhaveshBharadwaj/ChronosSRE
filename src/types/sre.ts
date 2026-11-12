export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL_FAULT' | 'REMEDIATING';

export interfaceZoneNode {
  az: string;
  regionName: string;
  status: HealthStatus;
  activePods: number;
  desiredPods: number;
  cpuSaturation: number;
  memSaturation: number;
  pdbMinAvailable: string;
  trafficWeight: number;
  workloads: {
    name: string;
    state: 'Running' | 'CrashLoopBackOff' | 'OOMKilled' | 'Cordoned' | 'Draining';
    restarts: number;
    latencyP99Ms: number;
  }[];
}

export interface SloWindow {
  window: string;
  burnRate: number;
  threshold: number;
  alertTier: 'NONE' | 'TICKET_P3' | 'PAGE_P1';
  budgetConsumedPct: number;
}

export interface ChaosFaultScenario {
  id: string;
  title: string;
  category: 'Network' | 'State / Cache' | 'Compute / Memory' | 'Upstream RPC';
  blastRadius: string;
  description: string;
  simulatedBurnRate1h: number;
  simulatedBurnRate6h: number;
  simulatedP99Ms: number;
  simulatedErrorRatePct: number;
  affectedAz: string;
  runbookName: string;
  mttdSeconds: number;
  mttrSeconds: number;
  remediationSteps: {
    step: number;
    action: string;
    command: string;
    verification: string;
  }[];
  terminalLogs: string[];
}

export interface SreControlPlaneState {
  clusterMeta: {
    clusterName: string;
    region: string;
    sloTargetPct: number;
    rollingWindowDays: number;
    errorBudgetRemainingPct: number;
    currentP99Ms: number;
    currentErrorRatePct: number;
    releaseGate: 'OPEN' | 'FROZEN_BY_SLO';
    mttdAvgSeconds: number;
    mttrAvgSeconds: number;
  };
  sloWindows: SloWindow[];
  availabilityZones: interfaceZoneNode[];
}
