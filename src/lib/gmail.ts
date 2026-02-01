import { google } from 'googleapis';
import { ParsedEmail } from '@/types';

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

// Set credentials if refresh token exists
if (process.env.GMAIL_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });
}

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

export function getAuthUrl(): string {
  const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

export async function getTokenFromCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
}

export async function fetchTransactionEmails(
  afterDate?: Date
): Promise<ParsedEmail[]> {
  const parsedEmails: ParsedEmail[] = [];

  try {
    // Build search query for Scapia transaction emails
    let query = 'subject:"Your transaction was successful" from:scapia';
    if (afterDate) {
      const dateStr = afterDate.toISOString().split('T')[0].replace(/-/g, '/');
      query += ` after:${dateStr}`;
    }

    // Fetch email list
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 50,
    });

    const messages = response.data.messages || [];

    // Fetch full email content for each message
    for (const message of messages) {
      if (!message.id) continue;

      try {
        const email = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full',
        });

        const parsed = parseScapiaEmail(message.id, email.data);
        if (parsed) {
          parsedEmails.push(parsed);
        }
      } catch (emailError) {
        console.error(`Error fetching email ${message.id}:`, emailError);
      }
    }

    return parsedEmails;
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  }
}

function parseScapiaEmail(
  emailId: string,
  emailData: { payload?: { body?: { data?: string }; parts?: Array<{ body?: { data?: string } }> } }
): ParsedEmail | null {
  try {
    // Get email body
    let body = '';

    if (emailData.payload?.body?.data) {
      body = Buffer.from(emailData.payload.body.data, 'base64').toString('utf-8');
    } else if (emailData.payload?.parts) {
      for (const part of emailData.payload.parts) {
        if (part.body?.data) {
          body += Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }
    }

    // Strip HTML tags if present
    body = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // Parse date and time
    // Format: "31-01-2026 at 11:20 AM"
    const dateMatch = body.match(/(\d{2}-\d{2}-\d{4})\s+at\s+(\d{1,2}:\d{2}\s*[AP]M)/i);
    if (!dateMatch) {
      console.error('Could not parse date from email');
      return null;
    }

    const [, datePart, timePart] = dateMatch;
    const [day, month, year] = datePart.split('-');
    const transactionDate = parseDateTime(`${year}-${month}-${day}`, timePart);

    // Parse amount
    // Format: "₹23.00" or "Rs. 23.00" or "INR 23.00"
    const amountMatch = body.match(/(?:₹|Rs\.?\s*|INR\s*)([\d,]+\.?\d*)/i);
    if (!amountMatch) {
      console.error('Could not parse amount from email');
      return null;
    }
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

    // Parse merchant
    // Look for "Merchant" followed by the merchant name
    const merchantMatch = body.match(/Merchant\s+(.+?)(?:\s+Not you\?|$)/i);
    if (!merchantMatch) {
      console.error('Could not parse merchant from email');
      return null;
    }
    const merchant = merchantMatch[1].trim();

    // Parse card ending
    // Format: "ending in 5059"
    const cardMatch = body.match(/ending\s+in\s+(\d{4})/i);
    const cardEnding = cardMatch ? cardMatch[1] : '0000';

    return {
      emailId,
      merchant,
      amount,
      transactionDate,
      cardEnding,
      rawEmail: body,
    };
  } catch (error) {
    console.error('Error parsing email:', error);
    return null;
  }
}

function parseDateTime(dateStr: string, timeStr: string): Date {
  // timeStr format: "11:20 AM" or "11:20AM"
  const cleanTime = timeStr.replace(/\s+/g, ' ').trim();
  const timeMatch = cleanTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);

  if (!timeMatch) {
    return new Date(dateStr);
  }

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const period = timeMatch[3].toUpperCase();

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  const date = new Date(dateStr);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export async function checkConnection(): Promise<boolean> {
  try {
    const response = await gmail.users.getProfile({ userId: 'me' });
    return !!response.data.emailAddress;
  } catch {
    return false;
  }
}
