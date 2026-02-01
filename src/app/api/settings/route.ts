import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { SettingsRow } from '@/types';

export async function GET() {
  try {
    const settings = await query<SettingsRow[]>('SELECT * FROM settings');

    const settingsMap: Record<string, string> = {};
    for (const row of settings) {
      settingsMap[row.key] = row.value;
    }

    return NextResponse.json({
      cronInterval: parseInt(settingsMap.cron_interval || '5', 10),
      ollamaModel: settingsMap.ollama_model || 'qwen2.5-coder:7b',
      lastSync: settingsMap.last_sync || null,
      gmailConnected: settingsMap.gmail_connected === 'true',
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { cronInterval, ollamaModel, gmailConnected } = body;

    if (cronInterval !== undefined) {
      await query(
        'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
        ['cron_interval', String(cronInterval), String(cronInterval)]
      );
    }

    if (ollamaModel !== undefined) {
      await query(
        'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
        ['ollama_model', ollamaModel, ollamaModel]
      );
    }

    if (gmailConnected !== undefined) {
      await query(
        'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
        ['gmail_connected', String(gmailConnected), String(gmailConnected)]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
