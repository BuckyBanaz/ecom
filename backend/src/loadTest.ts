import http from 'http';
import https from 'https';

// Load configuration or use defaults
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:5000/api/v1/products';
const TOTAL_REQUESTS = parseInt(process.env.TOTAL_REQUESTS || '1000', 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '100', 10);

console.log(`🚀 Starting load test on: ${TARGET_URL}`);
console.log(`📊 Total Requests: ${TOTAL_REQUESTS}`);
console.log(`⚡ Concurrency Limit: ${CONCURRENCY}`);
console.log('--------------------------------------------------');

interface Metric {
  status: number;
  duration: number;
  error?: string;
}

const metrics: Metric[] = [];
let completedCount = 0;
let activeCount = 0;
let requestIndex = 0;

// Determine whether to use HTTP or HTTPS
const client = TARGET_URL.startsWith('https') ? https : http;

function makeRequest(): Promise<void> {
  return new Promise((resolve) => {
    const startTime = process.hrtime();
    activeCount++;

    const req = client.get(TARGET_URL, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const endTime = process.hrtime(startTime);
        const durationMs = endTime[0] * 1000 + endTime[1] / 1000000;
        
        metrics.push({
          status: res.statusCode || 0,
          duration: durationMs
        });
        
        activeCount--;
        completedCount++;
        resolve();
      });
    });

    req.on('error', (err) => {
      const endTime = process.hrtime(startTime);
      const durationMs = endTime[0] * 1000 + endTime[1] / 1000000;
      
      metrics.push({
        status: 0,
        duration: durationMs,
        error: err.message
      });
      
      activeCount--;
      completedCount++;
      resolve();
    });

    req.end();
  });
}

async function run() {
  const globalStart = process.hrtime();
  
  async function worker() {
    while (requestIndex < TOTAL_REQUESTS) {
      const currentIdx = requestIndex++;
      if (currentIdx < TOTAL_REQUESTS) {
        await makeRequest();
      }
    }
  }

  // Spawn workers up to the concurrency limit
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(CONCURRENCY, TOTAL_REQUESTS); i++) {
    workers.push(worker());
  }

  // Monitor progress
  const progressInterval = setInterval(() => {
    const percentage = ((completedCount / TOTAL_REQUESTS) * 100).toFixed(1);
    console.log(`⏳ Progress: ${completedCount}/${TOTAL_REQUESTS} requests completed (${percentage}%) | 🏃 Active: ${activeCount}`);
  }, 1000);

  await Promise.all(workers);
  clearInterval(progressInterval);

  const globalEnd = process.hrtime(globalStart);
  const totalDurationSeconds = globalEnd[0] + globalEnd[1] / 1000000000;

  // Calculate statistics
  const successRequests = metrics.filter(m => m.status >= 200 && m.status < 300);
  const failedRequests = metrics.filter(m => m.status < 200 || m.status >= 300);
  const totalDurationSum = metrics.reduce((sum, m) => sum + m.duration, 0);
  const avgDuration = metrics.length ? totalDurationSum / metrics.length : 0;
  
  const durationsSorted = metrics.map(m => m.duration).sort((a, b) => a - b);
  const p50 = durationsSorted[Math.floor(durationsSorted.length * 0.50)] || 0;
  const p90 = durationsSorted[Math.floor(durationsSorted.length * 0.90)] || 0;
  const p99 = durationsSorted[Math.floor(durationsSorted.length * 0.99)] || 0;

  const errorSummary: Record<string, number> = {};
  metrics.forEach(m => {
    if (m.error) {
      errorSummary[m.error] = (errorSummary[m.error] || 0) + 1;
    } else if (m.status < 200 || m.status >= 300) {
      const statusStr = `HTTP ${m.status}`;
      errorSummary[statusStr] = (errorSummary[statusStr] || 0) + 1;
    }
  });

  console.log('\n================ 🎉 LOAD TEST RESULTS 🎉 ================');
  console.log(`⏱️  Total Time Elapsed:    ${totalDurationSeconds.toFixed(2)} seconds`);
  console.log(`📈 Requests/Second:       ${(TOTAL_REQUESTS / totalDurationSeconds).toFixed(2)}`);
  console.log(`✅ Successful Requests:   ${successRequests.length}`);
  console.log(`❌ Failed/Error Requests: ${failedRequests.length}`);
  console.log(`🌡️  Average Latency:       ${avgDuration.toFixed(2)} ms`);
  console.log(`🎯 p50 (Median Latency):  ${p50.toFixed(2)} ms`);
  console.log(`🔥 p90 Latency:           ${p90.toFixed(2)} ms`);
  console.log(`⚡ p99 Latency:           ${p99.toFixed(2)} ms`);
  
  if (Object.keys(errorSummary).length > 0) {
    console.log('\n💥 --- Error breakdown ---');
    for (const [err, count] of Object.entries(errorSummary)) {
      console.log(`   ⚠️  ${err}: ${count} times`);
    }
  }
  console.log('========================================================');
}

run().catch(console.error);
