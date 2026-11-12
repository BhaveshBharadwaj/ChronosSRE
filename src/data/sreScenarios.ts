import { SreControlPlaneState, ChaosFaultScenario } from '../types/sre';

export const BASELINE_SRE_STATE: SreControlPlaneState = {
  clusterMeta: {
    clusterName: 'prod-ap-south-k8s-01',
    region: 'ap-south-1 (Multi-AZ)',
    sloTargetPct: 99.95,
    rollingWindowDays: 30,
    errorBudgetRemainingPct: 86.4,
    currentP99Ms: 118,
    currentErrorRatePct: 0.012,
    releaseGate: 'OPEN',
    mttdAvgSeconds: 19,
    mttrAvgSeconds: 84,
  },
  sloWindows: [
    {
      window: '1h / 5m Fast-Burn Window',
      burnRate: 0.42,
      threshold: 14.4,
      alertTier: 'NONE',
      budgetConsumedPct: 0.8,
    },
    {
      window: '6h / 30m Medium-Burn Window',
      burnRate: 0.58,
      threshold: 6.0,
      alertTier: 'NONE',
      budgetConsumedPct: 2.1,
    },
    {
      window: '72h / 6h Slow-Burn Window',
      burnRate: 0.75,
      threshold: 1.0,
      alertTier: 'NONE',
      budgetConsumedPct: 10.7,
    },
  ],
  availabilityZones: [
    {
      az: 'ap-south-1a',
      regionName: 'Mumbai AZ-1a (Primary)',
      status: 'HEALTHY',
      activePods: 16,
      desiredPods: 16,
      cpuSaturation: 44,
      memSaturation: 58,
      pdbMinAvailable: '75% (12/16)',
      trafficWeight: 34,
      workloads: [
        { name: 'checkout-orchestrator', state: 'Running', restarts: 0, latencyP99Ms: 112 },
        { name: 'ledger-writer-grpc', state: 'Running', restarts: 0, latencyP99Ms: 94 },
        { name: 'redis-session-proxy', state: 'Running', restarts: 0, latencyP99Ms: 18 }
      ]
    },
    {
      az: 'ap-south-1b',
      regionName: 'Mumbai AZ-1b (Secondary)',
      status: 'HEALTHY',
      activePods: 16,
      desiredPods: 16,
      cpuSaturation: 41,
      memSaturation: 54,
      pdbMinAvailable: '75% (12/16)',
      trafficWeight: 33,
      workloads: [
        { name: 'checkout-orchestrator', state: 'Running', restarts: 0, latencyP99Ms: 119 },
        { name: 'ledger-writer-grpc', state: 'Running', restarts: 0, latencyP99Ms: 98 },
        { name: 'redis-session-proxy', state: 'Running', restarts: 0, latencyP99Ms: 19 }
      ]
    },
    {
      az: 'ap-south-1c',
      regionName: 'Mumbai AZ-1c (Quorum)',
      status: 'HEALTHY',
      activePods: 16,
      desiredPods: 16,
      cpuSaturation: 39,
      memSaturation: 52,
      pdbMinAvailable: '75% (12/16)',
      trafficWeight: 33,
      workloads: [
        { name: 'checkout-orchestrator', state: 'Running', restarts: 0, latencyP99Ms: 116 },
        { name: 'ledger-writer-grpc', state: 'Running', restarts: 0, latencyP99Ms: 91 },
        { name: 'redis-session-proxy', state: 'Running', restarts: 0, latencyP99Ms: 17 }
      ]
    }
  ]
};

export const CHAOS_SCENARIOS: ChaosFaultScenario[] = [
  {
    id: 'az-blackhole',
    title: 'AZ-1a Network Partition & Packet Blackhole',
    category: 'Network',
    blastRadius: 'Single Availability Zone (ap-south-1a)',
    description: 'Simulates an upstream fiber cut & NAT Gateway blackhole in ap-south-1a causing 92% packet loss across intra-AZ pods.',
    simulatedBurnRate1h: 18.6,
    simulatedBurnRate6h: 7.4,
    simulatedP99Ms: 1420,
    simulatedErrorRatePct: 4.85,
    affectedAz: 'ap-south-1a',
    runbookName: 'RB-101: Automated AZ Traffic Drain & Envoy Outlier Ejection',
    mttdSeconds: 15,
    mttrSeconds: 68,
    remediationSteps: [
      {
        step: 1,
        action: 'Trip Envoy Mesh Outlier Detection & Shift Ingress Weight 0% on ap-south-1a',
        command: 'kubectl patch virtualservice checkout-ingress --type merge -p '{"spec":{"http":[{"route":[{"destination":{"subset":"az-1b"},"weight":50},{"destination":{"subset":"az-1c"},"weight":50}]}]}}'',
        verification: 'Ingress traffic evacuated from ap-south-1a in 4.2s.'
      },
      {
        step: 2,
        action: 'Cordon Unreachable AZ-1a Worker Nodes Respecting PodDisruptionBudget',
        command: 'kubectl cordon -l topology.kubernetes.io/zone=ap-south-1a',
        verification: 'Nodes marked SchedulingDisabled; PDB quorum preserved.'
      },
      {
        step: 3,
        action: 'Trigger HorizontalPodAutoscaler Surge in Healthy AZ-1b & AZ-1c',
        command: 'kubectl scale deployment checkout-orchestrator --replicas=24 -n prod',
        verification: '8 replacement pods scheduled across AZ-1b/1c; p99 latency restored to 124ms.'
      }
    ],
    terminalLogs: [
      '[CHAOS-MESH] [12:34:01] Injecting NetworkChaos fault: loss=92% correlation=85% on zone=ap-south-1a',
      '[PROMETHEUS] [12:34:16] ALERT HighErrorBudgetBurn1h (18.6x > 14.4x threshold) — Paging On-Call P1',
      '[RELEASE-GATE] [12:34:17] Error budget burn critical -> Locking ArgoCD & GitHub Actions production deployments',
      '[AUTO-REMEDIATION] [12:34:20] Executing Runbook RB-101: Evacuating Envoy endpoints in ap-south-1a...',
      '[K8S-CONTROL] [12:34:38] Cordoned 4 worker nodes in ap-south-1a; scaling AZ-1b & AZ-1c replicas +50%',
      '[RECOVERY] [12:35:09] Synthetic canary probes 200 OK. Error rate dropped 4.85% -> 0.015% (MTTR: 68s)'
    ]
  },
  {
    id: 'redis-stampede',
    title: 'Redis Cache Stampede & DB Connection Exhaustion',
    category: 'State / Cache',
    blastRadius: 'Cross-AZ Shared Caching Tier',
    description: 'Simulates simultaneous TTL expiration of hot catalog keys causing a thundering herd against primary PostgreSQL RDS.',
    simulatedBurnRate1h: 15.9,
    simulatedBurnRate6h: 6.8,
    simulatedP99Ms: 980,
    simulatedErrorRatePct: 2.94,
    affectedAz: 'ap-south-1b',
    runbookName: 'RB-204: Singleflight Request Coalescing & Adaptive Load Shedding',
    mttdSeconds: 22,
    mttrSeconds: 91,
    remediationSteps: [
      {
        step: 1,
        action: 'Enable Request Coalescing (Singleflight) & Stale-While-Revalidate in Proxy ConfigMap',
        command: 'kubectl patch configmap redis-proxy-cfg -n prod --type merge -p '{"data":{"SINGLEFLIGHT_ENABLED":"true","STALE_TTL_SEC":"120"}}'',
        verification: 'Duplicate concurrent cache misses collapsed by 96.4%.'
      },
      {
        step: 2,
        action: 'Activate Envoy Adaptive Concurrency Filter to Shed Non-Critical Analytics Queries',
        command: 'kubectl apply -f k8s-resilience/envoy-load-shed-filter.yaml',
        verification: 'PostgreSQL active connections dropped from 500/500 to 118/500.'
      },
      {
        step: 3,
        action: 'Pre-Warm Top 1,000 Hot Keys with Jittered TTLs (300s ± 60s)',
        command: 'kubectl create job --from=cronjob/redis-key-warmer emergency-warm-01 -n prod',
        verification: 'Cache hit ratio recovered from 31% to 99.2%.'
      }
    ],
    terminalLogs: [
      '[CHAOS-MESH] [12:40:10] Flushed hot keyspace prefix catalog:v2:* across redis-session-proxy cluster',
      '[PROMETHEUS] [12:40:32] ALERT PgBouncerPoolSaturation (99.6% utilized) & FastBurn 15.9x triggered',
      '[AUTO-REMEDIATION] [12:40:35] Executing Runbook RB-204: Enabling Singleflight mutex & stale-while-revalidate...',
      '[ENVOY-FILTER] [12:40:54] Shedding priority=LOW background traffic; preserving checkout-orchestrator',
      '[RECOVERY] [12:41:41] Redis hit ratio restored to 99.2%; p99 latency stabilized at 115ms (MTTR: 91s)'
    ]
  },
  {
    id: 'memory-oom-leak',
    title: 'gRPC Worker Memory Leak (OOMKilled / CrashLoopBackOff)',
    category: 'Compute / Memory',
    blastRadius: 'ledger-writer-grpc Deployment (AZ-1c)',
    description: 'Simulates an unbounded goroutine buffer leak under high payload serialization, triggering Linux kernel OOMKiller (Exit Code 137).',
    simulatedBurnRate1h: 11.2,
    simulatedBurnRate6h: 6.3,
    simulatedP99Ms: 690,
    simulatedErrorRatePct: 1.65,
    affectedAz: 'ap-south-1c',
    runbookName: 'RB-309: Automated Canary Rollback & Vertical Memory Headroom Patch',
    mttdSeconds: 18,
    mttrSeconds: 74,
    remediationSteps: [
      {
        step: 1,
        action: 'Capture Heap Profile pprof Snapshot to S3 Forensics Bucket Before Eviction',
        command: 'kubectl exec deploy/ledger-writer-grpc -n prod -- curl -s http://localhost:6060/debug/pprof/heap > /tmp/heap-oom.pb.gz',
        verification: 'Heap artifact archived for blameless post-mortem analysis.'
      },
      {
        step: 2,
        action: 'Execute Deterministic Rollback of ledger-writer-grpc to Last Known Good Revision',
        command: 'kubectl rollout undo deployment/ledger-writer-grpc -n prod',
        verification: 'Rolled back image v2.8.4-canary -> v2.8.3-stable across all replicas.'
      },
      {
        step: 3,
        action: 'Enforce GOMEMLIMIT Soft Cap at 85% of Container cgroup Memory Limit',
        command: 'kubectl set env deployment/ledger-writer-grpc GOMEMLIMIT=1750MiB -n prod',
        verification: 'Zero Exit Code 137 OOMKills observed over 15m soak window.'
      }
    ],
    terminalLogs: [
      '[KUBELET] [12:51:04] Pod ledger-writer-grpc-7c9f8b-x92k terminated: OOMKilled (exit code 137)',
      '[PROMETHEUS] [12:51:22] ALERT KubePodCrashLooping & Medium-Burn 6.3x detected in ap-south-1c',
      '[AUTO-REMEDIATION] [12:51:25] Archiving pprof heap profile -> s3://chronos-sre-forensics/oom-9f82.pb.gz',
      '[K8S-ROLLOUT] [12:51:40] Executing kubectl rollout undo deployment/ledger-writer-grpc -n prod',
      '[RECOVERY] [12:52:18] All 16 pods Ready (0 restarts); memory RSS stabilized at 52% (MTTR: 74s)'
    ]
  }
];

export const SAMPLE_CUSTOM_PROMETHEUS_JSON = JSON.stringify({
  schema: "ChronosSRE-Prometheus-Alertmanager-v2",
  clusterName: "prod-us-east-financial-core",
  region: "us-east-1 (Multi-AZ)",
  sloTargetPct: 99.99,
  errorBudgetRemainingPct: 41.2,
  currentP99Ms: 412,
  currentErrorRatePct: 0.38,
  releaseGate: "FROZEN_BY_SLO",
  mttdAvgSeconds: 14,
  mttrAvgSeconds: 62,
  sloWindows: [
    {
      window: "1h / 5m Fast-Burn Window",
      burnRate: 16.4,
      threshold: 14.4,
      alertTier: "PAGE_P1",
      budgetConsumedPct: 34.2
    },
    {
      window: "6h / 30m Medium-Burn Window",
      burnRate: 6.9,
      threshold: 6.0,
      alertTier: "PAGE_P1",
      budgetConsumedPct: 18.5
    },
    {
      window: "72h / 6h Slow-Burn Window",
      burnRate: 1.4,
      threshold: 1.0,
      alertTier: "TICKET_P3",
      budgetConsumedPct: 6.1
    }
  ]
}, null, 2);
