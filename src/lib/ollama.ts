import { CategorizationResult, CategoryCorrectionRow } from '@/types';
import { query } from './db';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';

const CATEGORIES = [
  { id: 1, name: 'Food & Dining', keywords: ['restaurant', 'cafe', 'food', 'swiggy', 'zomato', 'dominos', 'mcdonald', 'kfc', 'pizza', 'burger', 'hotel', 'kitchen', 'dhaba', 'biryani', 'chai', 'coffee', 'bakery', 'sweet'] },
  { id: 2, name: 'Transportation', keywords: ['uber', 'ola', 'rapido', 'petrol', 'fuel', 'parking', 'metro', 'bus', 'auto', 'cab', 'taxi', 'toll', 'fastag', 'irctc', 'railway'] },
  { id: 3, name: 'Shopping', keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'mall', 'store', 'mart', 'retail', 'fashion', 'clothes', 'electronics', 'mobile', 'laptop'] },
  { id: 4, name: 'Entertainment', keywords: ['netflix', 'spotify', 'prime', 'hotstar', 'movie', 'cinema', 'pvr', 'inox', 'game', 'book my show', 'event', 'concert', 'subscription'] },
  { id: 5, name: 'Bills & Utilities', keywords: ['electricity', 'water', 'gas', 'broadband', 'internet', 'jio', 'airtel', 'vi', 'bsnl', 'mobile recharge', 'dth', 'insurance', 'emi'] },
  { id: 6, name: 'Healthcare', keywords: ['hospital', 'clinic', 'pharmacy', 'medical', 'doctor', 'medicine', 'apollo', 'medplus', 'netmeds', 'pharmeasy', 'diagnostic', 'lab', 'health'] },
  { id: 7, name: 'Travel', keywords: ['makemytrip', 'goibibo', 'cleartrip', 'yatra', 'flight', 'airline', 'indigo', 'air india', 'spicejet', 'oyo', 'airbnb', 'hotel booking', 'resort'] },
  { id: 8, name: 'Others', keywords: [] },
];

const SYSTEM_PROMPT = `You are a financial transaction categorizer. Your task is to categorize credit card transactions based on the merchant name.

CATEGORIES:
1. Food & Dining - Restaurants, cafes, food delivery, groceries
2. Transportation - Cabs, fuel, parking, public transport
3. Shopping - E-commerce, retail stores, fashion
4. Entertainment - Streaming, movies, games, events
5. Bills & Utilities - Phone, internet, electricity, insurance
6. Healthcare - Hospitals, pharmacies, medical services
7. Travel - Flights, hotels, travel bookings
8. Others - Anything that doesn't fit above

RULES:
- Analyze the merchant name carefully
- Consider common Indian merchants and UPI names
- Personal names (like "Mr. Arjun Kumar") are usually peer-to-peer transfers - categorize as "Others"
- Be confident in your categorization
- Return ONLY valid JSON, no explanations

OUTPUT FORMAT (strict JSON):
{"category_id": <number 1-8>, "category_name": "<exact name>", "confidence": <0.0-1.0>, "reasoning": "<brief reason>"}`;

interface FewShotExample {
  merchant: string;
  amount: number;
  response: {
    category_id: number;
    category_name: string;
    confidence: number;
    reasoning: string;
  };
}

const FEW_SHOT_EXAMPLES: FewShotExample[] = [
  {
    merchant: 'Swiggy',
    amount: 350,
    response: {
      category_id: 1,
      category_name: 'Food & Dining',
      confidence: 0.95,
      reasoning: 'Swiggy is a food delivery platform',
    },
  },
  {
    merchant: 'UBER INDIA',
    amount: 180,
    response: {
      category_id: 2,
      category_name: 'Transportation',
      confidence: 0.98,
      reasoning: 'Uber is a ride-hailing service',
    },
  },
  {
    merchant: 'Amazon Pay',
    amount: 1299,
    response: {
      category_id: 3,
      category_name: 'Shopping',
      confidence: 0.85,
      reasoning: 'Amazon is primarily an e-commerce platform',
    },
  },
  {
    merchant: 'Mr Arjun Kumar Yadav',
    amount: 500,
    response: {
      category_id: 8,
      category_name: 'Others',
      confidence: 0.9,
      reasoning: 'Personal name indicates peer-to-peer transfer',
    },
  },
  {
    merchant: 'Apollo Pharmacy',
    amount: 450,
    response: {
      category_id: 6,
      category_name: 'Healthcare',
      confidence: 0.95,
      reasoning: 'Apollo Pharmacy is a medical store chain',
    },
  },
];

async function getLearningExamples(): Promise<FewShotExample[]> {
  try {
    // Get recent corrections to learn from user feedback
    const corrections = await query<CategoryCorrectionRow[]>(
      `SELECT cc.merchant, cc.corrected_category_id, c.name as category_name
       FROM category_corrections cc
       JOIN categories c ON cc.corrected_category_id = c.id
       ORDER BY cc.created_at DESC
       LIMIT 10`
    );

    return corrections.map((c) => ({
      merchant: c.merchant,
      amount: 0,
      response: {
        category_id: c.corrected_category_id,
        category_name: c.category_name,
        confidence: 1.0,
        reasoning: 'User corrected category',
      },
    }));
  } catch {
    return [];
  }
}

function quickCategorize(merchant: string): CategorizationResult | null {
  const lowerMerchant = merchant.toLowerCase();

  for (const category of CATEGORIES) {
    for (const keyword of category.keywords) {
      if (lowerMerchant.includes(keyword.toLowerCase())) {
        return {
          categoryId: category.id,
          categoryName: category.name,
          confidence: 0.85,
          reasoning: `Matched keyword: ${keyword}`,
        };
      }
    }
  }

  return null;
}

export async function categorizeTransaction(
  merchant: string,
  amount: number
): Promise<CategorizationResult> {
  // Try quick keyword-based categorization first
  const quickResult = quickCategorize(merchant);
  if (quickResult && quickResult.confidence >= 0.85) {
    return quickResult;
  }

  try {
    // Get learning examples from user corrections
    const learningExamples = await getLearningExamples();

    // Check if we have a learned mapping for this merchant
    for (const example of learningExamples) {
      if (example.merchant.toLowerCase() === merchant.toLowerCase()) {
        return {
          categoryId: example.response.category_id,
          categoryName: example.response.category_name,
          confidence: 0.99,
          reasoning: 'Learned from user correction',
        };
      }
    }

    // Build messages for Ollama
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Add few-shot examples
    const allExamples = [...FEW_SHOT_EXAMPLES, ...learningExamples.slice(0, 5)];
    for (const example of allExamples) {
      messages.push({
        role: 'user',
        content: `Categorize this transaction:\nMerchant: ${example.merchant}\nAmount: ₹${example.amount || 'N/A'}`,
      });
      messages.push({
        role: 'assistant',
        content: JSON.stringify(example.response),
      });
    }

    // Add the actual transaction to categorize
    messages.push({
      role: 'user',
      content: `Categorize this transaction:\nMerchant: ${merchant}\nAmount: ₹${amount}`,
    });

    // Call Ollama API
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for consistent categorization
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.message?.content || '';

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      categoryId: parsed.category_id || 8,
      categoryName: parsed.category_name || 'Others',
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      reasoning: parsed.reasoning || 'AI categorization',
    };
  } catch (error) {
    console.error('Ollama categorization error:', error);

    // Fallback to "Others" category
    return {
      categoryId: 8,
      categoryName: 'Others',
      confidence: 0.3,
      reasoning: 'Fallback due to categorization error',
    };
  }
}

export async function checkOllamaConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!response.ok) return [];

    const data = await response.json();
    return data.models?.map((m: { name: string }) => m.name) || [];
  } catch {
    return [];
  }
}
