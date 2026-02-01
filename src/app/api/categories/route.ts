import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { CategoryRow } from '@/types';

export async function GET() {
  try {
    const categories = await query<CategoryRow[]>(
      'SELECT * FROM categories ORDER BY id'
    );
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, spendingLimit, colorCode, icon } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const result = await query<{ insertId: number }>(
      `INSERT INTO categories (name, spending_limit, color_code, icon)
       VALUES (?, ?, ?, ?)`,
      [name, spendingLimit || null, colorCode || '#6B7280', icon || 'tag']
    );

    return NextResponse.json({ id: result.insertId, success: true });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, spendingLimit, colorCode, icon } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (spendingLimit !== undefined) {
      updates.push('spending_limit = ?');
      params.push(spendingLimit);
    }
    if (colorCode !== undefined) {
      updates.push('color_code = ?');
      params.push(colorCode);
    }
    if (icon !== undefined) {
      updates.push('icon = ?');
      params.push(icon);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    params.push(id);
    await query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}
