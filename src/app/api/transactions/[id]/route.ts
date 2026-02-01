import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { TransactionRow } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transactions = await query<TransactionRow[]>(
      `SELECT t.*, c.name as category_name, c.color_code as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [id]
    );

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transactions[0]);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { categoryId, recordCorrection } = body;

    if (categoryId === undefined) {
      return NextResponse.json(
        { error: 'categoryId is required' },
        { status: 400 }
      );
    }

    // Get current transaction for correction logging
    const [transaction] = await query<TransactionRow[]>(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Update transaction category
    await query(
      'UPDATE transactions SET category_id = ?, confidence = 1.0 WHERE id = ?',
      [categoryId, id]
    );

    // Record correction for learning if category changed
    if (recordCorrection && transaction.category_id !== categoryId) {
      await query(
        `INSERT INTO category_corrections (transaction_id, original_category_id, corrected_category_id, merchant)
         VALUES (?, ?, ?, ?)`,
        [id, transaction.category_id, categoryId, transaction.merchant]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await query('DELETE FROM transactions WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
