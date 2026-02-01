import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { TransactionRow } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const categoryId = searchParams.get('categoryId');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let sql = `
      SELECT t.*, c.name as category_name, c.color_code as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (startDate) {
      sql += ' AND t.transaction_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND t.transaction_date <= ?';
      params.push(endDate + ' 23:59:59');
    }
    if (categoryId) {
      sql += ' AND t.category_id = ?';
      params.push(parseInt(categoryId, 10));
    }
    if (minAmount) {
      sql += ' AND t.amount >= ?';
      params.push(parseFloat(minAmount));
    }
    if (maxAmount) {
      sql += ' AND t.amount <= ?';
      params.push(parseFloat(maxAmount));
    }
    if (search) {
      sql += ' AND t.merchant LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY t.transaction_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const transactions = await query<TransactionRow[]>(sql, params);

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM transactions t WHERE 1=1';
    const countParams: unknown[] = [];

    if (startDate) {
      countSql += ' AND t.transaction_date >= ?';
      countParams.push(startDate);
    }
    if (endDate) {
      countSql += ' AND t.transaction_date <= ?';
      countParams.push(endDate + ' 23:59:59');
    }
    if (categoryId) {
      countSql += ' AND t.category_id = ?';
      countParams.push(parseInt(categoryId, 10));
    }
    if (minAmount) {
      countSql += ' AND t.amount >= ?';
      countParams.push(parseFloat(minAmount));
    }
    if (maxAmount) {
      countSql += ' AND t.amount <= ?';
      countParams.push(parseFloat(maxAmount));
    }
    if (search) {
      countSql += ' AND t.merchant LIKE ?';
      countParams.push(`%${search}%`);
    }

    const [countResult] = await query<Array<{ total: number }>>(countSql, countParams);

    return NextResponse.json({
      transactions,
      total: countResult?.total || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchant, amount, transactionDate, categoryId, confidence, rawEmail, emailId, cardEnding } = body;

    if (!merchant || !amount || !transactionDate || !emailId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await query<{ insertId: number }>(
      `INSERT INTO transactions (merchant, amount, transaction_date, category_id, confidence, raw_email, email_id, card_ending)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [merchant, amount, transactionDate, categoryId, confidence, rawEmail || '', emailId, cardEnding || '0000']
    );

    return NextResponse.json({ id: result.insertId, success: true });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
