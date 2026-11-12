# ⏱️ ChronosSRE — Autonomous SRE Reliability Control Plane & Chaos Workbench

**ChronosSRE** is a Site Reliability Engineering (SRE) control plane, Google SRE multi-window SLO error-budget calculator, and interactive Chaos Engineering auto-remediation workbench. Built with a zero-cost serverless architecture, it combines real production **Kubernetes HA manifests**, **Prometheus multi-burn-rate alerting rules**, and **Chaos Mesh experiments** with an interactive client-side reliability simulator.

---

## 🏗️ End-to-End SRE Incident Lifecycle

```text
+-----------------------+     +----------------------------+     +----------------------------+
| 1. Chaos Fault Inject | --> | 2. Multi-Window SLO Engine | --> | 3. Automated K8s Runbook   |
| • AZ-1a Blackhole     |     | • 1h/5m Fast Burn (14.4x)  |     | • Envoy Outlier Drain      |
| • Redis Stampede      |     | • 6h/30m Med Burn (6.0x)   |     | • Node Cordon + HPA Surge  |
| • gRPC OOMKilled      |     | • Auto CI/CD Release Freeze|     | • Singleflight Coalescing  |
+-----------------------+     +----------------------------+     +----------------------------+
```

---

## ✨ Key SRE Engineering Highlights

1. **Google SRE Multi-Window, Multi-Burn-Rate Alerting (`observability/prometheus-slo-burn-rules.yaml`)**
   * Implements dual-window alerting ($14.4\times$ fast burn over `1h/5m` and $6.0\times$ medium burn over `6h/30m`) for a **99.95% SLO tier** to eliminate false-positive paging while guaranteeing rapid detection.
   * Automatically locks the **CI/CD Release Gate** (`FROZEN_BY_SLO`) when error budget consumption crosses critical thresholds.
2. **Multi-AZ Kubernetes Failure Domain Resilience (`k8s-resilience/`)**
   * Enforces `topologySpreadConstraints` (`maxSkew: 1` across `ap-south-1a`, `1b`, `1c`), `PodDisruptionBudget` (`minAvailable: 75%`), and asymmetric `HorizontalPodAutoscaler` scale-up/scale-down stabilization windows.
3. **Interactive Chaos Fault Injector & Deterministic Auto-Remediation (`src/`)**
   * Simulate **AZ Network Blackholes**, **Redis Cache Stampedes**, and **gRPC `OOMKilled` Memory Leaks** directly in the browser and execute step-by-step automated remediation playbooks while tracking **MTTD** and **MTTR**.
4. **Client-Side Prometheus / Alertmanager JSON Ingest (`Push Prometheus / SLO JSON`)**
   * Upload or paste custom Prometheus Alertmanager webhooks or SLO burn-rate payloads to dynamically evaluate cluster posture in browser memory.

---

## 🚀 Quick Start

```bash
npm install
npm run dev
```
