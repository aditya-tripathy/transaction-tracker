import { NextRequest, NextResponse } from 'next/server';
import { fetchTransactionEmails, checkConnection } from '@/lib/gmail';
import { categorizeTransaction, checkOllamaConnection } from '@/lib/ollama';
import { query } from '@/lib/db';
import { TransactionRow } from '@/types';

// This endpoint can be called by external cron services (like cron-job.org)
// or by the internal scheduler

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let emailsProcessed = 0;
  let transactionsCreated = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  try {
    // Verify cron secret if provided
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check services
    const gmailConnected = await checkConnection();
    if (!gmailConnected) {
      return NextResponse.json(
        { error: 'Gmail not connected', code: 'GMAIL_NOT_CONNECTED' },
        { status: 503 }
      );
    }

    const ollamaConnected = await checkOllamaConnection();
    if (!ollamaConnected) {
      return NextResponse.json(
        { error: 'Ollama not running', code: 'OLLAMA_NOT_RUNNING' },
        { status: 503 }
      );
    }

    // Get last sync date
    const [lastSyncRow] = await query<Array<{ value: string }>>(
      "SELECT value FROM settings WHERE `key` = 'last_sync'"
    );
    const lastSync = lastSyncRow?.value ? new Date(lastSyncRow.value) : undefined;

    // Fetch new emails
    const emails = await fetchTransactionEmails(lastSync);
    emailsProcessed = emails.length;

    if (emails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new emails',
        emailsProcessed: 0,
        transactionsCreated: 0,
      });
    }

    // Get existing email IDs
    const existingEmailIds = await query<TransactionRow[]>(
      'SELECT email_id FROM transactions'
    );
    const existingIds = new Set(existingEmailIds.map((t) => t.email_id));

    // Process emails
    for (const email of emails) {
      if (existingIds.has(email.emailId)) {
        continue;
      }

      try {
        const categorization = await categorizeTransaction(
          email.merchant,
          email.amount
        );

        await query(
          `INSERT INTO transactions
           (merchant, amount, transaction_date, category_id, confidence, raw_email, email_id, card_ending)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            email.merchant,
            email.amount,
            email.transactionDate,
            categorization.categoryId,
            categorization.confidence,
            email.rawEmail,
            email.emailId,
            email.cardEnding,
          ]
        );

        transactionsCreated++;
      } catch (txError) {
        errors++;
        errorDetails.push(`${email.merchant}: ${txError}`);
      }
    }

    // Update last sync
    const now = new Date().toISOString();
    await query(
      "INSERT INTO settings (`key`, value) VALUES ('last_sync', ?) ON DUPLICATE KEY UPDATE value = ?",
      [now, now]
    );

    // Log result
    const duration = Date.now() - startTime;
    await query(
      `INSERT INTO processing_log (emails_processed, transactions_created, errors, error_details, duration_ms)
       VALUES (?, ?, ?, ?, ?)`,
      [emailsProcessed, transactionsCreated, errors, errorDetails.length > 0 ? JSON.stringify(errorDetails) : null, duration]
    );

    return NextResponse.json({
      success: true,
      emailsProcessed,
      transactionsCreated,
      errors,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Cron error:', error);

    // Log error
    await query(
      `INSERT INTO processing_log (emails_processed, transactions_created, errors, error_details, duration_ms)
       VALUES (?, ?, ?, ?, ?)`,
      [emailsProcessed, transactionsCreated, 1, JSON.stringify([String(error)]), duration]
    ).catch(() => {});

    return NextResponse.json(
      { error: 'Cron job failed', details: String(error) },
      { status: 500 }
    );
  }
}

// Health check for cron status
export async function GET() {
  try {
    const [lastLog] = await query<Array<{
      timestamp: Date;
      emails_processed: number;
      transactions_created: number;
      errors: number;
    }>>(
      'SELECT * FROM processing_log ORDER BY timestamp DESC LIMIT 1'
    );

    const gmailConnected = await checkConnection();
    const ollamaConnected = await checkOllamaConnection();

    return NextResponse.json({
      status: 'ok',
      gmailConnected,
      ollamaConnected,
      lastRun: lastLog || null,
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: String(error) },
      { status: 500 }
    );
  }
}
