import { RowDataPacket } from 'mysql2';

// Database row types
export interface TransactionRow extends RowDataPacket {
  id: number;
  merchant: string;
  amount: number;
  transaction_date: Date;
  category_id: number | null;
  confidence: number | null;
  raw_email: string;
  email_id: string;
  card_ending: string;
  created_at: Date;
  updated_at: Date;
}

export interface CategoryRow extends RowDataPacket {
  id: number;
  name: string;
  spending_limit: number | null;
  color_code: string;
  icon: string;
  created_at: Date;
}

export interface ProcessingLogRow extends RowDataPacket {
  id: number;
  timestamp: Date;
  emails_processed: number;
  transactions_created: number;
  errors: number;
  error_details: string | null;
  duration_ms: number;
}

export interface CategoryCorrectionRow extends RowDataPacket {
  id: number;
  transaction_id: number;
  original_category_id: number | null;
  corrected_category_id: number;
  merchant: string;
  created_at: Date;
}

export interface SettingsRow extends RowDataPacket {
  id: number;
  key: string;
  value: string;
  updated_at: Date;
}

// API types
export interface Transaction {
  id: number;
  merchant: string;
  amount: number;
  transactionDate: Date;
  categoryId: number | null;
  categoryName?: string;
  categoryColor?: string;
  confidence: number | null;
  cardEnding: string;
  createdAt: Date;
}

export interface Category {
  id: number;
  name: string;
  spendingLimit: number | null;
  colorCode: string;
  icon: string;
}

export interface ProcessingLog {
  id: number;
  timestamp: Date;
  emailsProcessed: number;
  transactionsCreated: number;
  errors: number;
  errorDetails: string | null;
  durationMs: number;
}

// Email parsing types
export interface ParsedEmail {
  emailId: string;
  merchant: string;
  amount: number;
  transactionDate: Date;
  cardEnding: string;
  rawEmail: string;
}

// Ollama types
export interface CategorizationResult {
  categoryId: number;
  categoryName: string;
  confidence: number;
  reasoning: string;
}

export interface OllamaResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

// Stats types
export interface CategorySpending {
  categoryId: number;
  categoryName: string;
  colorCode: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  total: number;
  categories: Record<string, number>;
}

export interface DashboardStats {
  totalSpent: number;
  transactionCount: number;
  avgTransaction: number;
  topCategory: string;
  categoryBreakdown: CategorySpending[];
  monthlyTrends: MonthlyTrend[];
  recentTransactions: Transaction[];
}

// Settings types
export interface AppSettings {
  cronInterval: number;
  gmailConnected: boolean;
  lastSync: Date | null;
  ollamaModel: string;
}

// Filter types
export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: number;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}
