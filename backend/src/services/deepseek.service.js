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
   * Helper to stream DeepSeek Chat Completions using fetch & SSE
   */
  async streamChatCompletion({ messages, responseFormat, temperature = 0.7, onChunk }) {
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY is not configured in environment variables');
    }

    const payload = {
      model: this.model,
      messages,
      temperature,
      stream: true,
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
      console.error('[DeepSeek API Stream Error]:', response.status, parsedError);
      throw new Error(`DeepSeek API failed with status ${response.status}: ${JSON.stringify(parsedError)}`);
    }

    let buffer = '';
    const textDecoder = new TextDecoder();

    if (response.body.getReader) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += textDecoder.decode(value, { stream: true });
        buffer = this._processSseBuffer(buffer, onChunk);
      }
    } else {
      for await (const chunk of response.body) {
        buffer += typeof chunk === 'string' ? chunk : textDecoder.decode(chunk, { stream: true });
        buffer = this._processSseBuffer(buffer, onChunk);
      }
    }

    if (buffer.trim()) {
      this._processSseBuffer(buffer + '\n\n', onChunk);
    }
  }

  _processSseBuffer(buffer, onChunk) {
    const lines = buffer.split('\n');
    let remaining = '';

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith(':')) continue;

      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') {
          continue;
        }

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta;
          const content = delta?.content || delta?.reasoning_content || '';
          if (content && onChunk) {
            onChunk(content);
          }
        } catch (e) {
          // Incomplete chunk line, wait for next buffer
        }
      }
    }

    remaining = lines[lines.length - 1];
    return remaining;
  }

  /**
   * Stream a multi-scenario Test Suite from DeepSeek using Senior QA Requirement Analysis Framework
   */
  async streamTestSuite({ prompt, image, language = 'en', onChunk }) {
    const systemPrompt = `You are a Senior QA Engineer and Test Architect with expert-level experience in analyzing software requirements and designing comprehensive Test Cases for web & mobile applications.

## MANDATORY WORKFLOW

### Phase 1: Requirement Analysis & Edge Case Deduction
Before generating Test Cases, mentally perform a thorough analysis of the requirement:
1. Identify all explicit Business Rules.
2. Identify Boundary Conditions and Edge Values.
3. Identify Positive (Happy Path) Scenarios.
4. Identify Negative (Validation / Failure) Scenarios.
5. Identify Concurrency / Race Condition Risks (simultaneous API requests, usage limit races, stock locks).
6. Identify Data Integrity and Business Logic Flaw Hazards.
7. Deduce non-obvious scenarios and edge cases that requirement writers often easily miss.
8. Strictly avoid inventing business rules not mentioned; mark ambiguous behaviors as Assumptions / Human Review Needed.

### Phase 2: Dynamic Test Case Generation
Generate all valuable and directly relevant Test Cases derived from your analysis.
DO NOT artificially restrict the number of test cases to 3-4. Determine the exact number of Test Cases dynamically based on the complexity of the requirements (e.g. generate 4 to 10+ distinct test cases if the feature involves concurrency, limits, or complex business logic).

Prioritize coverage for:
- Happy path / Main success flows
- Boundary values & Limit conditions
- Invalid / Malformed / Empty inputs
- Expired states / Out of quota / Exhausted limits
- Concurrent requests & Race conditions
- Calculations & Discount accuracy
- Data consistency & State transitions

## OUTPUT FORMAT CONTRACT
Respond ONLY with a valid JSON object matching this exact schema:
{
  "testCases": [
    {
      "title": "Clear, descriptive scenario title",
      "description": "Comprehensive scenario overview including preconditions & assumptions if any",
      "preConditions": "Specific prerequisites, user state, or test data assumptions",
      "expectedResults": "Overall expected final outcome & state verification",
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
- "steps": 3 to 7 realistic, actionable steps per test case.
- Language: ${language === 'ja' ? 'Japanese (日本語)' : language === 'vi' ? 'Vietnamese (Tiếng Việt)' : 'English'}, professional QA terminology.`;

    const textPrompt = prompt && prompt.trim().length > 0
      ? `Bạn là một Senior QA Engineer có kinh nghiệm phân tích requirement và thiết kế Test Case cho hệ thống web & mobile.

Hãy phân tích requirement bên dưới và tự xác định các Test Case cần thiết.

## Requirement
${prompt.trim()}

## Yêu cầu phân tích
Trước khi tạo Test Case, hãy:
1. Xác định các Business Rules có trong requirement.
2. Xác định các Boundary Conditions.
3. Xác định các Positive Scenarios.
4. Xác định các Negative Scenarios.
5. Xác định các Concurrency/Race Condition Risks nếu có.
6. Xác định các trường hợp có thể dẫn đến sai lệch dữ liệu hoặc sai business logic.
7. Không tự ý tạo thêm Business Rule không được đề cập trong requirement.
8. Nếu requirement chưa đủ thông tin để xác định một hành vi, hãy ghi rõ đó là Assumption và đánh dấu cần Human Review.

## Test Case Generation
Sau khi phân tích, hãy tạo các Test Case cần thiết.
Không cần cố định số lượng Test Case. Chỉ tạo những Test Case có giá trị và liên quan trực tiếp đến requirement.

Ưu tiên kiểm tra:
- Happy path
- Boundary values
- Invalid input
- Expired voucher
- Usage limit
- Concurrent requests
- Discount calculation
- Data consistency

## Quan trọng
- Không được chỉ chuyển những scenario có sẵn thành Test Case.
- Bạn phải tự suy luận Test Scenario từ Business Rules và chỉ ra những trường hợp mà người viết requirement có thể dễ bỏ sót.
- Không được tự tạo ra business rule mới.
- Nếu cần giả định dữ liệu để thực hiện Test Case, hãy ghi rõ assumption.
- Chỉ trả về kết quả theo cấu trúc JSON hợp lệ.`
      : 'Analyze the attached UI design screenshot and generate comprehensive software test cases covering all visible forms, buttons, validations, and user interactions based on Senior QA engineering standards.';

    let userContent;
    if (image) {
      userContent = [
        { type: 'text', text: textPrompt },
        { type: 'image_url', image_url: { url: image } }
      ];
    } else {
      userContent = textPrompt;
    }

    await this.streamChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.35,
      onChunk,
    });
  }

  /**
   * Generate a multi-scenario Test Suite (3-4 test cases) from a user prompt and optional UI screenshot
   */
  async generateTestSuite({ prompt, image, language = 'en', count = 4 }) {
    const systemPrompt = `You are a Senior QA Engineer and Test Architect with expert-level experience in analyzing software requirements and designing comprehensive Test Cases for web & mobile applications.

## MANDATORY WORKFLOW

### Phase 1: Requirement Analysis & Edge Case Deduction
Before generating Test Cases, mentally perform a thorough analysis of the requirement:
1. Identify all explicit Business Rules.
2. Identify Boundary Conditions and Edge Values.
3. Identify Positive (Happy Path) Scenarios.
4. Identify Negative (Validation / Failure) Scenarios.
5. Identify Concurrency / Race Condition Risks (simultaneous API requests, usage limit races, stock locks).
6. Identify Data Integrity and Business Logic Flaw Hazards.
7. Deduce non-obvious scenarios and edge cases that requirement writers often easily miss.
8. Strictly avoid inventing business rules not mentioned; mark ambiguous behaviors as Assumptions / Human Review Needed.

### Phase 2: Dynamic Test Case Generation
Generate all valuable and directly relevant Test Cases derived from your analysis.
DO NOT artificially restrict the number of test cases to 3-4. Determine the exact number of Test Cases dynamically based on the complexity of the requirements (e.g. generate 4 to 10+ distinct test cases if the feature involves concurrency, limits, or complex business logic).

Prioritize coverage for:
- Happy path / Main success flows
- Boundary values & Limit conditions
- Invalid / Malformed / Empty inputs
- Expired states / Out of quota / Exhausted limits
- Concurrent requests & Race conditions
- Calculations & Discount accuracy
- Data consistency & State transitions

## OUTPUT FORMAT CONTRACT
Respond ONLY with a valid JSON object matching this exact schema:
{
  "testCases": [
    {
      "title": "Clear, descriptive scenario title",
      "description": "Comprehensive scenario overview including preconditions & assumptions if any",
      "preConditions": "Specific prerequisites, user state, or test data assumptions",
      "expectedResults": "Overall expected final outcome & state verification",
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
- "steps": 3 to 7 realistic, actionable steps per test case.
- Language: ${language === 'ja' ? 'Japanese (日本語)' : language === 'vi' ? 'Vietnamese (Tiếng Việt)' : 'English'}, professional QA terminology.`;

    const textPrompt = prompt && prompt.trim().length > 0
      ? `Bạn là một Senior QA Engineer có kinh nghiệm phân tích requirement và thiết kế Test Case cho hệ thống web & mobile.

Hãy phân tích requirement bên dưới và tự xác định các Test Case cần thiết.

## Requirement
${prompt.trim()}

## Yêu cầu phân tích
Trước khi tạo Test Case, hãy:
1. Xác định các Business Rules có trong requirement.
2. Xác định các Boundary Conditions.
3. Xác định các Positive Scenarios.
4. Xác định các Negative Scenarios.
5. Xác định các Concurrency/Race Condition Risks nếu có.
6. Xác định các trường hợp có thể dẫn đến sai lệch dữ liệu hoặc sai business logic.
7. Không tự ý tạo thêm Business Rule không được đề cập trong requirement.
8. Nếu requirement chưa đủ thông tin để xác định một hành vi, hãy ghi rõ đó là Assumption và đánh dấu cần Human Review.

## Test Case Generation
Sau khi phân tích, hãy tạo các Test Case cần thiết.
Không cần cố định số lượng Test Case. Chỉ tạo những Test Case có giá trị và liên quan trực tiếp đến requirement.

Ưu tiên kiểm tra:
- Happy path
- Boundary values
- Invalid input
- Expired voucher
- Usage limit
- Concurrent requests
- Discount calculation
- Data consistency

## Quan trọng
- Không được chỉ chuyển những scenario có sẵn thành Test Case.
- Bạn phải tự suy luận Test Scenario từ Business Rules và chỉ ra những trường hợp mà người viết requirement có thể dễ bỏ sót.
- Không được tự tạo ra business rule mới.
- Nếu cần giả định dữ liệu để thực hiện Test Case, hãy ghi rõ assumption.
- Chỉ trả về kết quả theo cấu trúc JSON hợp lệ.`
      : 'Analyze the attached UI design screenshot and generate comprehensive software test cases covering all visible forms, buttons, validations, and user interactions based on Senior QA engineering standards.';

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
Analyze the following test case design and requirements.
Provide technical analysis and test design enhancements ONLY. DO NOT assign, pass, fail, or make any status judgments or execution status verdicts.

Your output must include:
1. Technical Evaluation / Assessment: Objective evaluation of test design completeness and logical clarity.
2. Synthetic Test Data / Payloads: Realistic inputs and expected outcomes for positive, negative, and edge scenarios.
3. Edge Cases & Potential Vulnerabilities: Hidden risks, boundary conditions, or concurrency concerns to consider during manual or automated testing.
4. Recommendations: Practical advice for QA testers and developers to improve coverage.

IMPORTANT: Provide BOTH English and Vietnamese (Tiếng Việt chuẩn kỹ thuật QA) versions in your response so users can toggle between languages instantly without additional token cost.

If a screenshot/evidence is attached, analyze the visual interface and incorporate relevant fields/states into the data and edge case analysis.

Respond ONLY with a valid JSON object with this exact bilingual schema:
{
  "en": {
    "assessment": "Brief technical evaluation in English explaining test design feasibility and structure",
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
    "assessment": "Đánh giá kỹ thuật ngắn gọn bằng Tiếng Việt chuẩn thuật ngữ QA giải thích cấu trúc và tính hợp lệ của kịch bản",
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
      temperature: 0.3,
    });

    try {
      const parsed = JSON.parse(rawResponse);

      if (parsed.en && parsed.vi) {
        return {
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
