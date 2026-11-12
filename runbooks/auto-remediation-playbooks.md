# 📖 ChronosSRE Deterministic Auto-Remediation Runbooks

## RB-101: Availability Zone Network Blackhole & Envoy Outlier Ejection
* **Trigger Condition:** `SLOFastBurnPageP1` (`burn_rate_1h > 14.4x`) correlated with intra-AZ packet loss > 50%.
* **Automated Remediation Sequence:**
  1. Shift Envoy `VirtualService` traffic weight to `0%` for the degraded Availability Zone.
  2. Cordon affected worker nodes (`kubectl cordon -l topology.kubernetes.io/zone=<az>`) while respecting `PodDisruptionBudget`.
  3. Trigger `HorizontalPodAutoscaler` surge across surviving Availability Zones.

## RB-204: Redis Cache Stampede & Connection Pool Exhaustion
* **Trigger Condition:** `PgBouncerPoolSaturation > 95%` + Redis hit ratio drop below `50%`.
* **Automated Remediation Sequence:**
  1. Enable request coalescing (`Singleflight`) and `stale-while-revalidate` in the caching proxy ConfigMap.
  2. Activate Envoy adaptive concurrency load-shedding for low-priority batch queries.
  3. Dispatch jittered key-warming Kubernetes Job.
