/**
 * DeepSeek AI Service
 * Handles interactions with DeepSeek API (OpenAI-compatible) with Vision Support
 */

require('dotenv').config();

class DeepSeekService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  }

  /**
   * Helper to call DeepSeek Chat Completions
   */
  async callChatCompletion({ messages, responseFormat, temperature = 0.7 }) {
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY is not configured in environment variables');
    }

    const payload = {
      model: this.model,
      messages,
      temperature,
    };

    if (responseFormat) {
      payload.response_format = responseFormat;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError = errorText;
      try {
        parsedError = JSON.parse(errorText);
      } catch (_) {}
      console.error('[DeepSeek API Error]:', response.status, parsedError);
      throw new Error(`DeepSeek API failed with status ${response.status}: ${JSON.stringify(parsedError)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Generate a multi-scenario Test Suite (3-4 test cases) from a user prompt and optional UI screenshot
   */
  async generateTestSuite({ prompt, image, language = 'en', count = 4 }) {
    const systemPrompt = `You are a Principal QA Architect and Test Strategist at a tier-1 tech enterprise.
Your task is to analyze the user's requirements and any attached UI screenshot / wireframe / design mockup.
Generate a comprehensive, multi-scenario Test Suite (3 to 4 distinct test cases) covering:
1. Happy Path / Positive Scenario (Standard successful business flow based on visible buttons/forms)
2. Negative / Validation Scenario (Invalid inputs, empty fields, bad format, disabled buttons)
3. Boundary / Concurrency / Rate Limiting (Limits, edge conditions, simultaneous actions)
4. Resilience / Security / Exception Handling (Network error, session timeout, unauthorized action)

If a UI screenshot or image is provided:
- Visually inspect all visible components: inputs, labels, buttons, navigation, dropdowns, tables, error messages.
- Write realistic test cases matching the exact UI components shown in the image.

Rules:
1. Respond ONLY with a valid JSON object matching this schema:
{
  "testCases": [
    {
      "title": "Clear, descriptive title",
      "description": "Comprehensive scenario overview",
      "preConditions": "Prerequisites",
      "expectedResults": "Overall expected final outcome",
      "priority": 0,
      "type": 4,
      "complexity": "2",
      "steps": [
        {
          "stepNo": 1,
          "step": "Detailed step action",
          "result": "Expected result for this step"
        }
      ]
    }
  ]
}

Value Guidelines:
- "priority": integer 0 (Critical/P1), 1 (High/P2), 2 (Medium/P3), 3 (Low/P4).
- "type": integer index:
  0: Other, 1: Security, 2: Performance, 3: Accessibility, 4: Functional,
  5: Acceptance, 6: Usability, 7: Smoke&Sanity, 8: Compatibility,
  9: Destructive, 10: Regression, 11: Automated, 12: Manual.
- "complexity": string "1" (Easy), "2" (Medium), or "3" (Hard).
- "steps": 3 to 6 realistic, actionable steps per test case.
- Language: ${language === 'vi' ? 'Vietnamese (Tiếng Việt)' : 'English'}, professional QA terminology.`;

    const textPrompt = prompt && prompt.trim().length > 0
      ? `Feature requirement: ${prompt.trim()}`
      : 'Analyze the attached UI design screenshot and generate comprehensive software test cases covering all visible forms, buttons, validations, and user interactions.';

    let userContent;
    if (image) {
      userContent = [
        { type: 'text', text: textPrompt },
        { type: 'image_url', image_url: { url: image } }
      ];
    } else {
      userContent = textPrompt;
    }

    const rawResponse = await this.callChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.35,
    });

    try {
      const parsed = JSON.parse(rawResponse);
      const rawCases = Array.isArray(parsed.testCases)
        ? parsed.testCases
        : Array.isArray(parsed)
        ? parsed
        : [parsed];

      return rawCases.map((c, idx) => ({
        title: c.title || `Test Case ${idx + 1}`,
        description: c.description || prompt || 'Generated from image',
        preConditions: c.preConditions || '',
        expectedResults: c.expectedResults || '',
        priority: typeof c.priority === 'number' && c.priority >= 0 && c.priority <= 3 ? c.priority : 1,
        type: typeof c.type === 'number' && c.type >= 0 && c.type <= 12 ? c.type : 4,
        complexity: ['1', '2', '3'].includes(String(c.complexity)) ? String(c.complexity) : '2',
        steps: Array.isArray(c.steps) ? c.steps : [],
        stepsDetail: Array.isArray(c.steps)
          ? c.steps.map((s) => `${s.stepNo || 1}. ${s.step}\nExpected: ${s.result}`).join('\n\n')
          : '',
      }));
    } catch (err) {
      console.error('[DeepSeek parse error]:', err, rawResponse);
      throw new Error('Failed to parse DeepSeek response into valid test suite JSON');
    }
  }

  /**
   * Generate a single structured Test Case (for single mode) with optional image
   */
  async generateTestCase({ prompt, image, language = 'en' }) {
    const suite = await this.generateTestSuite({ prompt, image, language, count: 1 });
    return suite[0] || null;
  }

  /**
   * Execute AI analysis & test data generation for an existing testcase with optional evidence image
   */
  async executeTestCase({ testCase, image, language = 'en' }) {
    const systemPrompt = `You are an AI Test Automation Engineer and QA Analyst.
Analyze the following test case and any attached screenshot / test execution evidence.
Provide:
1. Synthetic test data / payload for positive and negative testing.
2. Potential edge cases and security vulnerabilities to look out for.
3. Quality assessment and execution recommendation (passed, failed, or pending).

IMPORTANT: Provide BOTH English and Vietnamese (Tiếng Việt chuẩn kỹ thuật QA) versions in your response so users can toggle between languages instantly without additional token cost.

If a screenshot/evidence is attached, analyze whether the screen shows a bug, error, or expected behavior.

Respond ONLY with a valid JSON object with this exact bilingual schema:
{
  "suggestedStatus": "passed" | "pending" | "failed",
  "en": {
    "assessment": "Brief technical evaluation in English",
    "testData": [
      {
        "scenario": "Positive / Happy Path",
        "inputs": "Specific input values",
        "expectedOutcome": "What should happen"
      },
      {
        "scenario": "Negative / Boundary",
        "inputs": "Invalid or extreme input values",
        "expectedOutcome": "Proper validation or error message"
      }
    ],
    "edgeCases": [
      "Edge case description 1 in English",
      "Edge case description 2 in English"
    ],
    "recommendations": "Advice for developer and tester in English"
  },
  "vi": {
    "assessment": "Đánh giá kỹ thuật ngắn gọn bằng Tiếng Việt chuẩn thuật ngữ QA",
    "testData": [
      {
        "scenario": "Kịch bản tích cực / Luồng chính (Happy Path)",
        "inputs": "Dữ liệu đầu vào cụ thể",
        "expectedOutcome": "Kết quả mong đợi"
      },
      {
        "scenario": "Kịch bản tiêu cực / Trường hợp biên (Boundary/Negative)",
        "inputs": "Dữ liệu biên hoặc không hợp lệ",
        "expectedOutcome": "Xử lý lỗi hoặc thông báo hợp lệ"
      }
    ],
    "edgeCases": [
      "Mô tả trường hợp biên 1 bằng Tiếng Việt",
      "Mô tả trường hợp biên 2 bằng Tiếng Việt"
    ],
    "recommendations": "Lời khuyên cho lập trình viên và kiểm thử viên bằng Tiếng Việt"
  }
}`;

    const textContent = `Test Case to analyze:\n${JSON.stringify(testCase, null, 2)}`;
    let userContent;
    if (image) {
      userContent = [
        { type: 'text', text: textContent },
        { type: 'image_url', image_url: { url: image } }
      ];
    } else {
      userContent = textContent;
    }

    const rawResponse = await this.callChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.5,
    });

    try {
      const parsed = JSON.parse(rawResponse);
      if (parsed.en && parsed.vi) {
        return {
          suggestedStatus: parsed.suggestedStatus || parsed.en.suggestedStatus || 'pending',
          en: parsed.en,
          vi: parsed.vi,
          // Root fallbacks for backward compatibility
          assessment: parsed.en.assessment,
          testData: parsed.en.testData,
          edgeCases: parsed.en.edgeCases,
          recommendations: parsed.en.recommendations,
        };
      }
      return parsed;
    } catch (err) {
      console.error('[DeepSeek parse error]:', err, rawResponse);
      throw new Error('Failed to parse DeepSeek response into valid analysis JSON');
    }
  }
}

module.exports = new DeepSeekService();
