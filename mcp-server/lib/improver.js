/**
 * improver.js — 자동 프롬프트 개선 + 개선 루프 (v0.5.1)
 *
 * - generateImprovedPrompt(): 분석 결과 기반 개선 프롬프트 생성
 * - runImprovementLoop(): 목표 점수 도달까지 자동 반복
 */

// ─────────────────────────────────────────────
// 개선 생성용 시스템 프롬프트
// 원본의 의도를 유지하면서 missingElements만 보완
// ─────────────────────────────────────────────
const IMPROVE_SYSTEM_PROMPT = `당신은 AI 프롬프트 개선 전문가입니다.
주어진 원본 프롬프트와 분석 결과를 바탕으로 개선된 버전을 작성하세요.

규칙:
1. 원본 프롬프트의 핵심 의도와 주제를 반드시 유지한다
2. missingElements에 명시된 요소를 자연스럽게 보완한다
3. 불필요한 내용을 추가하지 않는다 (간결하게)
4. 점수가 낮은 축(axisScores)을 우선 개선한다
5. 개선된 프롬프트 텍스트만 반환한다 (설명, 마크다운 불필요)`;

/**
 * 로컬 규칙 기반 개선 (API 키 없을 때 사용)
 * 원본 프롬프트에 누락 요소를 템플릿으로 추가한다.
 */
function improvePromptLocal(entry) {
  const parts = [];
  const missing = entry.missingElements || [];
  const prompt = entry.prompt || '';

  // 역할 누락 시 추가
  if (missing.includes('role') || missing.includes('Role')) {
    parts.push('당신은 이 분야의 전문가입니다.');
  }

  // 원본 프롬프트
  parts.push(prompt);

  // 맥락 누락 시 힌트 추가
  if (missing.includes('context') || missing.includes('Context')) {
    parts.push('\n배경: [구체적인 배경 상황을 여기에 추가하세요]');
  }

  // 출력 형식 누락 시 추가
  if (missing.includes('output_format') || missing.includes('Output Format') || missing.includes('format')) {
    parts.push('\n출력 형식: 명확하고 구조화된 형태로 작성해주세요.');
  }

  // 예시 누락 시 추가
  if (missing.includes('examples') || missing.includes('Example') || missing.includes('example')) {
    parts.push('\n예시를 포함하여 설명해주세요.');
  }

  // 제약조건 누락 시 추가
  if (missing.includes('constraints') || missing.includes('Constraints') || missing.includes('constraint')) {
    parts.push('\n제약사항: [구체적인 제약조건을 여기에 추가하세요]');
  }

  return parts.join('\n');
}

/**
 * Claude API를 사용해 개선된 프롬프트를 생성한다.
 * @param {Object} entry - 원본 히스토리 엔트리 (prompt, score, axisScores, missingElements)
 * @param {string|null} apiKey - Anthropic API 키 (없으면 local fallback)
 * @param {string} model - 사용할 모델
 * @returns {Promise<string>} 개선된 프롬프트 텍스트
 */
async function generateImprovedPrompt(entry, apiKey, model = 'claude-sonnet-4-6') {
  // API 키 없으면 로컬 규칙 기반 개선
  if (!apiKey) {
    return improvePromptLocal(entry);
  }

  const userMessage = `원본 프롬프트:
${entry.prompt}

분석 결과:
- 종합 점수: ${entry.score}/100
- 5축 점수: clarity=${entry.axisScores?.[0]}, specificity=${entry.axisScores?.[1]}, context=${entry.axisScores?.[2]}, structure=${entry.axisScores?.[3]}, actionability=${entry.axisScores?.[4]}
- 누락 요소: ${(entry.missingElements || []).join(', ') || '없음'}

위 분석 결과를 바탕으로 개선된 프롬프트를 작성해주세요.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system: IMPROVE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      // API 실패 시 local fallback
      return improvePromptLocal(entry);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;

    if (text && text.trim().length > 0) {
      return text.trim();
    }

    return improvePromptLocal(entry);
  } catch {
    // 네트워크 오류 → local fallback
    return improvePromptLocal(entry);
  }
}

/**
 * 목표 점수 도달까지 개선→재분석을 반복한다.
 * @param {string} startEntryId - 시작 엔트리 ID
 * @param {Object} options
 * @param {number} options.targetScore - 목표 점수 (기본 85)
 * @param {number} options.maxIterations - 최대 반복 횟수 (기본 5)
 * @param {Object} options.storage - Storage 인스턴스
 * @param {Function} options.analyzePrompt - local 분석 함수
 * @param {Function} options.generateImprovedPrompt - 개선 생성 함수
 * @param {string} options.apiKey - API 키
 * @param {string} options.model - 모델
 * @param {string} options.projectId - 저장할 프로젝트 ID
 * @param {Object} options.session - 세션 컨텍스트
 * @returns {Promise<Object>} 루프 결과
 */
async function runImprovementLoop(startEntryId, options) {
  const {
    targetScore = 85,
    maxIterations = 5,
    storage,
    analyzePrompt,
    generateImprovedPrompt: improveFn,
    apiKey,
    model,
    projectId,
    session
  } = options;

  let currentId = startEntryId;
  const history = [];

  for (let i = 0; i < maxIterations; i++) {
    // 1. 현재 엔트리 조회
    const entry = await storage.findEntryById(currentId);
    if (!entry) {
      throw new Error(`runImprovementLoop iter ${i}: entry not found: ${currentId}`);
    }

    history.push({
      iteration: i + 1,
      entryId: currentId,
      score: entry.score,
      grade: entry.grade
    });

    // 2. 목표 달성 확인
    if (entry.score >= targetScore) {
      return {
        goalReached: true,
        iterations: i + 1,
        finalEntryId: currentId,
        finalScore: entry.score,
        finalGrade: entry.grade,
        finalPrompt: entry.prompt,
        targetScore,
        history
      };
    }

    // 3. 개선 생성
    const improvedPrompt = await improveFn(entry, apiKey, model);

    // 4. 개선본 분석
    const analysis = analyzePrompt(improvedPrompt);

    // 5. 히스토리에 저장 (parentId 연결)
    const savedEntry = await storage.addHistoryEntry(projectId, {
      prompt: improvedPrompt,
      enhanced: analysis.enhancedPrompt || '',
      score: analysis.score,
      axisScores: analysis.axisScores,
      tags: [...(entry.tags || []), '#loop'],
      note: `[loop iter ${i + 1}] from ${currentId} (${entry.score} → ${analysis.score})`,
      platform: 'claude',
      parentId: currentId
    });

    // 세션 컨텍스트 업데이트
    if (session) {
      session.setLastEntry(savedEntry.id, projectId);
    }

    currentId = savedEntry.id;
  }

  // maxIterations 초과: 현재까지 최고 점수 반환
  const finalEntry = await storage.findEntryById(currentId);
  history.push({
    iteration: maxIterations + 1,
    entryId: currentId,
    score: finalEntry?.score || 0,
    grade: finalEntry?.grade || 'D'
  });

  return {
    goalReached: false,
    iterations: maxIterations,
    finalEntryId: currentId,
    finalScore: finalEntry?.score || 0,
    finalGrade: finalEntry?.grade || 'D',
    finalPrompt: finalEntry?.prompt || '',
    targetScore: options.targetScore || 85,
    history,
    message: `목표 점수(${options.targetScore || 85})에 도달하지 못했습니다. 최대 반복 횟수(${maxIterations})를 초과했습니다.`
  };
}

export { generateImprovedPrompt, runImprovementLoop };
