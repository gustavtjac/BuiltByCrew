import 'dotenv/config';
import cron from 'node-cron';
import { runPipeline, postFollowUpTweets } from './pipeline';

const RUN_NOW = process.argv.includes('--run-now');

async function dailyJob(): Promise<void> {
  console.log(`[scheduler] Daily job triggered at ${new Date().toISOString()}`);

  try {
    await postFollowUpTweets();
  } catch (err) {
    console.error('[scheduler] Follow-up tweet pass failed:', err);
  }

  try {
    await runPipeline();
  } catch (err) {
    console.error('[scheduler] Pipeline run failed:', err);
    // Do not rethrow — let the scheduler survive individual run failures
  }
}

if (RUN_NOW) {
  console.log('[scheduler] --run-now flag detected; running pipeline immediately');
  dailyJob().catch(err => {
    console.error('[scheduler] Fatal error in manual run:', err);
    process.exit(1);
  });
} else {
  // Run once per day at 06:00 server local time
  cron.schedule('0 6 * * *', () => {
    dailyJob().catch(err => {
      console.error('[scheduler] Unhandled error in scheduled job:', err);
    });
  });
  console.log('[scheduler] Scheduled to run daily at 06:00. Waiting...');
}
