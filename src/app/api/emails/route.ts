import { NextRequest, NextResponse } from 'next/server';
import { fetchTransactionEmails, checkConnection } from '@/lib/gmail';
import { categorizeTransaction } from '@/lib/ollama';
import { query } from '@/lib/db';
import { TransactionRow } from '@/types';

export async function GET() {
  try {
    const connected = await checkConnection();
    return NextResponse.json({ connected });
  } catch (error) {
    console.error('Error checking email connection:', error);
    return NextResponse.json({ connected: false });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let emailsProcessed = 0;
  let transactionsCreated = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  try {
    const body = await request.json();
    const { manual } = body;

    // Get last sync date from settings
    const [lastSyncRow] = await query<Array<{ value: string }>>(
      "SELECT value FROM settings WHERE `key` = 'last_sync'"
    );
    const lastSync = lastSyncRow?.value ? new Date(lastSyncRow.value) : undefined;

    // Fetch emails from Gmail
    const emails = await fetchTransactionEmails(manual ? undefined : lastSync);
    emailsProcessed = emails.length;

    // Get existing email IDs to skip duplicates
    const existingEmailIds = await query<TransactionRow[]>(
      'SELECT email_id FROM transactions'
    );
    const existingIds = new Set(existingEmailIds.map((t) => t.email_id));

    // Process each email
    for (const email of emails) {
      if (existingIds.has(email.emailId)) {
        continue; // Skip duplicate
      }

      try {
        // Categorize using Ollama
        const categorization = await categorizeTransaction(
          email.merchant,
          email.amount
        );

        // Insert transaction
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
        errorDetails.push(`Failed to process ${email.merchant}: ${txError}`);
        console.error('Transaction processing error:', txError);
      }
    }

    // Update last sync time
    const now = new Date().toISOString();
    await query(
      "INSERT INTO settings (`key`, value) VALUES ('last_sync', ?) ON DUPLICATE KEY UPDATE value = ?",
      [now, now]
    );

    // Log processing result
    const duration = Date.now() - startTime;
    await query(
      `INSERT INTO processing_log (emails_processed, transactions_created, errors, error_details, duration_ms)
       VALUES (?, ?, ?, ?, ?)`,
      [
        emailsProcessed,
        transactionsCreated,
        errors,
        errorDetails.length > 0 ? JSON.stringify(errorDetails) : null,
        duration,
      ]
    );

    return NextResponse.json({
      success: true,
      emailsProcessed,
      transactionsCreated,
      errors,
      duration,
    });
  } catch (error) {
    console.error('Email sync error:', error);

    // Log error
    const duration = Date.now() - startTime;
    await query(
      `INSERT INTO processing_log (emails_processed, transactions_created, errors, error_details, duration_ms)
       VALUES (?, ?, ?, ?, ?)`,
      [emailsProcessed, transactionsCreated, 1, JSON.stringify([String(error)]), duration]
    ).catch(() => {});

    return NextResponse.json(
      { error: 'Failed to sync emails', details: String(error) },
      { status: 500 }
    );
  }
}
