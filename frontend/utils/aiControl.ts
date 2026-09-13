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

