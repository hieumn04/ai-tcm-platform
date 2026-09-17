import Config from '@/config/config';

const apiServer = Config.apiServer;

export interface GeneratedCaseData {
  title: string;
  description: string;
  preConditions: string;
  expectedResults: string;
  priority: number;
  type: number;
  complexity: '1' | '2' | '3';
  steps: { stepNo: number; step: string; result: string }[];
  stepsDetail: string;
}

export interface AiAnalysisData {
  assessment: string;
  suggestedStatus: 'passed' | 'pending' | 'failed';
  testData: {
    scenario: string;
    inputs: string;
    expectedOutcome: string;
  }[];
  edgeCases: string[];
  recommendations: string;
}

/**
 * Generate test case(s) from prompt using DeepSeek AI (Suite or Single)
 */
export async function generateTestCasesWithAi(
  jwt: string,
  folderId: number,
  prompt: string,
  mode: 'suite' | 'single' = 'suite',
  language: 'vi' | 'en' = 'en',
  image?: string | null
): Promise<GeneratedCaseData[]> {
  const url = `${apiServer}/ai/generate`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ folderId, prompt, mode, language, image }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `API error: ${response.status}`);
    }

    const result = await response.json();
    if (result.data?.testCases && Array.isArray(result.data.testCases)) {
      return result.data.testCases;
    }
    if (result.data && Array.isArray(result.data)) {
      return result.data;
    }
    if (result.data?.singleCase) {
      return [result.data.singleCase];
    }
    if (result.data) {
      return [result.data];
    }
    return [];
  } catch (error: any) {
    console.error('Error generating test cases with AI:', error.message);
    throw error;
  }
}

/**
 * Stream test case generation from DeepSeek via SSE
 */
export async function streamGenerateTestCasesWithAi(
  jwt: string,
  folderId: number,
  prompt: string,
  language: 'vi' | 'en' | 'ja' = 'en',
  image: string | null | undefined,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  // Use direct backend origin to bypass Next.js rewrites proxy buffering SSE
  const rawBase =
    typeof window !== 'undefined' && process.env.NEXT_PUBLIC_BACKEND_ORIGIN
      ? process.env.NEXT_PUBLIC_BACKEND_ORIGIN
      : apiServer;
  const cleanBase = rawBase.replace(/\/+$/, '');
  const url = cleanBase.endsWith('/api')
    ? `${cleanBase}/ai/generate-stream`
    : `${cleanBase}/api/ai/generate-stream`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ folderId, prompt, language, image }),
    signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Streaming error: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('ReadableStream not supported by response');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullRawText = '';
  let sseBuffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    sseBuffer += decoder.decode(value, { stream: true });
    const lines = sseBuffer.split('\n');
    sseBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      if (trimmed.startsWith('data: ')) {
        const payload = trimmed.slice(6).trim();
        if (payload === '[DONE]') {
          continue;
        }

        try {
          const parsed = JSON.parse(payload);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.text) {
            fullRawText += parsed.text;
            onChunk(parsed.text);
          }
        } catch (e: any) {
          if (e.message && !e.message.includes('JSON')) {
            throw e;
          }
        }
      }
    }
  }

  return fullRawText;
}

/**
 * Validate and parse raw AI response string into structured GeneratedCaseData[]
 * (Point 7 from Architecture Review: strict schema validation)
 */
export function validateAndParseTestSuite(rawText: string): GeneratedCaseData[] {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('Empty AI response received');
  }

  let cleanJson = rawText.trim();
  const jsonBlockMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    cleanJson = jsonBlockMatch[1].trim();
  } else {
    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
    }
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleanJson);
  } catch (parseErr: any) {
    console.error('Failed to parse AI JSON:', cleanJson);
    throw new Error(`Invalid JSON syntax from AI: ${parseErr.message}`);
  }

  const rawList = Array.isArray(parsed.testCases)
    ? parsed.testCases
    : Array.isArray(parsed)
    ? parsed
    : [parsed];

  if (rawList.length === 0) {
    throw new Error('No test case scenarios found in AI output');
  }

  const validatedCases: GeneratedCaseData[] = rawList.map((item: any, idx: number) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Test case item at index ${idx + 1} is invalid`);
    }

    const title = item.title && typeof item.title === 'string' ? item.title.trim() : `Test Case ${idx + 1}`;
    const description = item.description || '';
    const preConditions = item.preConditions || '';
    const expectedResults = item.expectedResults || '';
    const priority = typeof item.priority === 'number' && item.priority >= 0 && item.priority <= 3 ? item.priority : 1;
    const type = typeof item.type === 'number' && item.type >= 0 && item.type <= 12 ? item.type : 4;
    const complexity = ['1', '2', '3'].includes(String(item.complexity)) ? (String(item.complexity) as any) : '2';

    const steps = Array.isArray(item.steps)
      ? item.steps.map((s: any, sIdx: number) => ({
          stepNo: s.stepNo || sIdx + 1,
          step: s.step || s.action || '',
          result: s.result || s.expectedResult || '',
        }))
      : [];

    const stepsDetail = steps
      .map((s: any) => `${s.stepNo}. ${s.step}\nExpected: ${s.result}`)
      .join('\n\n');

    return {
      title,
      description,
      preConditions,
      expectedResults,
      priority,
      type,
      complexity,
      steps,
      stepsDetail,
    };
  });

  return validatedCases;
}

/**
 * Backward-compatible single case generator
 */
export async function generateTestCaseWithAi(
  jwt: string,
  folderId: number,
  prompt: string,
  language: 'vi' | 'en' = 'en'
): Promise<GeneratedCaseData | null> {
  const cases = await generateTestCasesWithAi(jwt, folderId, prompt, 'single', language);
  return cases[0] || null;
}

/**
 * Save single AI generated test case to database
 */
export async function saveAiTestCase(
  jwt: string,
  folderId: number,
  caseData: GeneratedCaseData
) {
  const url = `${apiServer}/ai/save`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ folderId, caseData }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `API error: ${response.status}`);
    }

    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error('Error saving AI test case:', error.message);
    throw error;
  }
}

/**
 * Save batch of AI generated test cases to database
 */
export async function saveBatchAiTestCases(
  jwt: string,
  folderId: number,
  cases: GeneratedCaseData[]
) {
  const url = `${apiServer}/ai/save-batch`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ folderId, cases }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `API error: ${response.status}`);
    }

    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error('Error saving batch AI test cases:', error.message);
    throw error;
  }
}

export interface AiAnalysisContent {
  assessment: string;
  testData: {
    scenario: string;
    inputs: string;
    expectedOutcome: string;
  }[];
  edgeCases: string[];
  recommendations: string;
}

export interface AiAnalysisData {
  assessment: string;
  suggestedStatus: 'passed' | 'pending' | 'failed';
  testData: {
    scenario: string;
    inputs: string;
    expectedOutcome: string;
  }[];
  edgeCases: string[];
  recommendations: string;
  analyzedAt?: string;
  savedAt?: string;
  en?: AiAnalysisContent;
  vi?: AiAnalysisContent;
}

/**
 * Execute AI test analysis with DeepSeek
 */
export async function executeCaseWithAi(
  jwt: string,
  testCase: any,
  language: 'vi' | 'en' = 'en',
  webhookId?: string,
  image?: string | null,
  runCaseId?: number
): Promise<AiAnalysisData | null> {
  const url = `${apiServer}/ai/execute`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ testCase, webhookId, language, image, runCaseId, autoSave: true }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `API error: ${response.status}`);
    }

    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error('Error executing AI analysis:', error.message);
    throw error;
  }
}

/**
 * Save or update AI assessment for a runCase or case
 */
export async function saveAiAssessment(
  jwt: string,
  params: { runCaseId?: number; caseId?: number; assessment: AiAnalysisData }
) {
  const url = `${apiServer}/ai/save-assessment`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `API error: ${response.status}`);
    }

    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error('Error saving AI assessment:', error.message);
    throw error;
  }
}

