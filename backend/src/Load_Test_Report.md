# Load Testing & API Stress Analysis Report

This report documents the load testing execution and performance analysis of the E-commerce backend API. Tests were executed locally and against the staging/production servers to identify performance bottlenecks and evaluate rate-limiting configurations.

---

## 📊 Summary of Test Scenarios

| Test Run | Target URL | Total Requests | Concurrency Limit | Success Rate | Avg Latency | Key Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Run #1 (Local)** | `http://localhost:5000/api/v1/products` | 1,000 | 100 | **100%** | 760.61 ms | ✅ 200 OK |
| **Run #2 (Server)** | `https://api.schipenster.com/api/v1/products` | 1,000 | 100 | **100%** | 882.15 ms | ✅ 200 OK |
| **Run #3 (Server Stress)** | `https://api.schipenster.com/api/v1/products` | 10,000 | 400 | **9.76%** | 964.33 ms | 💥 Rate Limited |

---

## 🔍 Detailed Analysis of Stress Run (10,000 Requests)

During the high-volume concurrent test (10k requests at 400 parallel connections), the server responded with defenses:

### 1. Active Rate Limiting (HTTP 429)
* **Count:** `8,846` times (88.46% of total requests)
* **Response Status:** `HTTP 429 Too Many Requests`
* **Analysis:** The backend middleware (`express-rate-limit` backed by Redis/Memory Store) successfully identified the high-frequency burst from a single client and blocked it. This prevents database degradation and ensures resource availability for legitimate users.

### 2. Network Timed Out (ETIMEDOUT)
* **Count:** `178` times (1.78% of total requests)
* **Error:** `connect ETIMEDOUT 187.124.21.137:443`
* **Analysis:** With 400 workers making parallel calls, some connections timed out at the socket connection handshake layer before HTTP request parsing occurred.

---

## 💡 Recommendations & Conclusions

> [!TIP]
> **Rate Limiter operates correctly:** 
> The application's rate limiter configuration behaves as expected under brute-force or high-stress requests, protecting core database queries from crashing the application layer.

> [!NOTE]
> If you intend to run absolute raw performance tests beyond this constraint:
> 1. Whitelist the testing IP in your rate limiting configuration.
> 2. Or, temporarily adjust/disable rate limit environments on the staging server for load testing windows.
