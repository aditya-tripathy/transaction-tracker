import cron from 'node-cron';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || '';

let currentJob: cron.ScheduledTask | null = null;
let currentInterval = 5; // minutes

async function runSync() {
  console.log(`[${new Date().toISOString()}] Running transaction sync...`);

  try {
    const response = await fetch(`${API_URL}/api/cron`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CRON_SECRET && { Authorization: `Bearer ${CRON_SECRET}` }),
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`[${new Date().toISOString()}] Sync completed:`, {
        emailsProcessed: data.emailsProcessed,
        transactionsCreated: data.transactionsCreated,
        errors: data.errors,
        duration: `${data.duration}ms`,
      });
    } else {
      console.error(`[${new Date().toISOString()}] Sync failed:`, data.error);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Sync error:`, error);
  }
}

async function fetchInterval(): Promise<number> {
  try {
    const response = await fetch(`${API_URL}/api/settings`);
    if (response.ok) {
      const data = await response.json();
      return data.cronInterval || 5;
    }
  } catch {
    // Use default if settings unavailable
  }
  return 5;
}

function startScheduler(intervalMinutes: number) {
  // Stop existing job
  if (currentJob) {
    currentJob.stop();
    currentJob = null;
  }

  currentInterval = intervalMinutes;
  const cronExpression = `*/${intervalMinutes} * * * *`;

  console.log(`[${new Date().toISOString()}] Starting scheduler with interval: ${intervalMinutes} minutes`);
  console.log(`[${new Date().toISOString()}] Cron expression: ${cronExpression}`);

  currentJob = cron.schedule(cronExpression, runSync, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });

  // Run immediately on start
  runSync();
}

async function checkIntervalChange() {
  const newInterval = await fetchInterval();
  if (newInterval !== currentInterval) {
    console.log(`[${new Date().toISOString()}] Interval changed: ${currentInterval} -> ${newInterval} minutes`);
    startScheduler(newInterval);
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('Transaction Tracker - Scheduler');
  console.log('='.repeat(50));

  // Initial interval fetch
  const interval = await fetchInterval();
  startScheduler(interval);

  // Check for interval changes every minute
  cron.schedule('* * * * *', checkIntervalChange, {
    scheduled: true,
  });

  console.log(`[${new Date().toISOString()}] Scheduler started. Press Ctrl+C to stop.`);
}

main().catch(console.error);
