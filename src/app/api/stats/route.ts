import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const months = parseInt(searchParams.get('months') || '6', 10);

    // Get total spending stats
    const [totals] = await query<Array<{
      total_spent: number;
      transaction_count: number;
      avg_transaction: number;
    }>>(
      `SELECT
        COALESCE(SUM(amount), 0) as total_spent,
        COUNT(*) as transaction_count,
        COALESCE(AVG(amount), 0) as avg_transaction
       FROM transactions
       WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)`,
      [months]
    );

    // Get category breakdown
    const categoryBreakdown = await query<Array<{
      category_id: number;
      category_name: string;
      color_code: string;
      total_amount: number;
      transaction_count: number;
    }>>(
      `SELECT
        c.id as category_id,
        c.name as category_name,
        c.color_code,
        COALESCE(SUM(t.amount), 0) as total_amount,
        COUNT(t.id) as transaction_count
       FROM categories c
       LEFT JOIN transactions t ON c.id = t.category_id
         AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
       GROUP BY c.id, c.name, c.color_code
       ORDER BY total_amount DESC`,
      [months]
    );

    const totalSpent = totals?.total_spent || 0;
    const categoryWithPercentage = categoryBreakdown.map((c) => ({
      ...c,
      percentage: totalSpent > 0 ? (c.total_amount / totalSpent) * 100 : 0,
    }));

    // Get monthly trends
    const monthlyTrends = await query<Array<{
      month: string;
      category_name: string;
      total_amount: number;
    }>>(
      `SELECT
        DATE_FORMAT(t.transaction_date, '%Y-%m') as month,
        c.name as category_name,
        SUM(t.amount) as total_amount
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
       GROUP BY DATE_FORMAT(t.transaction_date, '%Y-%m'), c.name
       ORDER BY month ASC`,
      [months]
    );

    // Transform monthly trends for chart
    const monthlyMap = new Map<string, { month: string; total: number; categories: Record<string, number> }>();
    for (const row of monthlyTrends) {
      if (!monthlyMap.has(row.month)) {
        monthlyMap.set(row.month, { month: row.month, total: 0, categories: {} });
      }
      const entry = monthlyMap.get(row.month)!;
      entry.categories[row.category_name || 'Others'] = row.total_amount;
      entry.total += row.total_amount;
    }

    // Get top category
    const topCategory = categoryWithPercentage.find((c) => c.total_amount > 0)?.category_name || 'None';

    // Get recent transactions
    const recentTransactions = await query<Array<{
      id: number;
      merchant: string;
      amount: number;
      transaction_date: Date;
      category_name: string;
      category_color: string;
    }>>(
      `SELECT t.id, t.merchant, t.amount, t.transaction_date,
              c.name as category_name, c.color_code as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       ORDER BY t.transaction_date DESC
       LIMIT 10`
    );

    // Get spending alerts (categories over limit)
    const alerts = await query<Array<{
      category_name: string;
      spending_limit: number;
      total_spent: number;
    }>>(
      `SELECT c.name as category_name, c.spending_limit, SUM(t.amount) as total_spent
       FROM categories c
       JOIN transactions t ON c.id = t.category_id
       WHERE c.spending_limit IS NOT NULL
         AND t.transaction_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
       GROUP BY c.id, c.name, c.spending_limit
       HAVING total_spent > spending_limit`
    );

    return NextResponse.json({
      totalSpent: totals?.total_spent || 0,
      transactionCount: totals?.transaction_count || 0,
      avgTransaction: totals?.avg_transaction || 0,
      topCategory,
      categoryBreakdown: categoryWithPercentage,
      monthlyTrends: Array.from(monthlyMap.values()),
      recentTransactions,
      alerts,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
