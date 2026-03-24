/**
 * tagger.js — 자동 태그 추천 (v0.5.1)
 *
 * local 모드: 규칙 기반 키워드 감지 (비용 없음)
 * api 모드: Claude API 경량 호출로 의미 기반 태그 생성 (분석 호출과 별도)
 */

// ─────────────────────────────────────────────
// 키워드 → 태그 매핑 테이블
// 확장 시 이 테이블에 행만 추가하면 됨
// ─────────────────────────────────────────────
const TAG_RULES = [
  // 도메인
  { keywords: ['코드', 'code', '함수', 'function', '구현', 'implement', '클래스', 'class', '알고리즘', 'algorithm', 'debug', '디버그', '버그', 'bug'], tag: '#coding' },
  { keywords: ['글', 'writing', '작성', 'write', '블로그', 'blog', '기사', 'article', '에세이', 'essay'], tag: '#writing' },
  { keywords: ['분석', 'analyze', 'analysis', '비교', 'compare', '평가', 'evaluate', '데이터', 'data'], tag: '#analysis' },
  { keywords: ['데이터', 'data', 'csv', 'json', 'sql', '쿼리', 'query', '데이터베이스', 'database'], tag: '#data' },
  { keywords: ['창작', 'creative', '스토리', 'story', '소설', '시', 'poem', '캐릭터', 'character'], tag: '#creative' },

  // 용도
  { keywords: ['요약', 'summarize', 'summary', '정리', '줄여', 'tldr'], tag: '#summarize' },
  { keywords: ['번역', 'translate', 'translation', '영어로', '한국어로', '일본어로', '중국어로'], tag: '#translate' },
  { keywords: ['설명', 'explain', 'explanation', '알려줘', '가르쳐', 'teach', '이해'], tag: '#explain' },
  { keywords: ['생성', 'generate', 'create', '만들어', '작성해', '제작'], tag: '#generate' },
  { keywords: ['리뷰', 'review', '검토', '피드백', 'feedback', '수정', 'fix', '개선', 'improve'], tag: '#review' },

  // 출력 형식
  { keywords: ['json', 'yaml', 'xml', 'api', 'schema'], tag: '#structured' },
  { keywords: ['목록', 'list', '리스트', '순서', '나열', 'enumerate'], tag: '#list' },
  { keywords: ['표', 'table', '테이블', '비교표', 'matrix'], tag: '#table' },

  // 기술 스택 힌트
  { keywords: ['react', 'vue', 'angular', 'svelte', '프론트엔드', 'frontend', 'html', 'css', 'tailwind'], tag: '#frontend' },
  { keywords: ['node', 'express', 'nest', 'go', 'golang', 'python', 'django', 'flask', '백엔드', 'backend', 'api', 'rest', 'graphql'], tag: '#backend' },
  { keywords: ['aws', 'gcp', 'azure', 'docker', 'kubernetes', 'k8s', '인프라', 'infra', 'terraform', 'ci/cd', 'devops'], tag: '#infra' },
  { keywords: ['unity', 'unreal', 'godot', '게임', 'game', '렌더링', 'shader'], tag: '#gamedev' },
];

/**
 * 프롬프트 텍스트에서 규칙 기반으로 태그를 추천한다. (local 모드)
 * @param {string} promptText - 분석 대상 프롬프트
 * @param {number} maxTags - 최대 태그 수 (기본 5)
 * @returns {string[]} 추천 태그 배열 (예: ['#coding', '#backend'])
 */
function suggestTagsLocal(promptText, maxTags = 5) {
  const lower = promptText.toLowerCase();
  const matched = [];

  for (const rule of TAG_RULES) {
    // 키워드가 하나라도 매칭되면 해당 태그 추가
    const hitCount = rule.keywords.filter(kw => lower.includes(kw)).length;
    if (hitCount > 0) {
      matched.push({ tag: rule.tag, hitCount });
    }
  }

  // 매칭 키워드 수 내림차순 정렬 → 가장 관련도 높은 태그부터 반환
  matched.sort((a, b) => b.hitCount - a.hitCount);

  // 중복 태그 제거 (동일 태그가 여러 규칙에서 매칭될 수 있으므로)
  const seen = new Set();
  const result = [];
  for (const m of matched) {
    if (!seen.has(m.tag)) {
      seen.add(m.tag);
      result.push(m.tag);
    }
    if (result.length >= maxTags) break;
  }

  return result;
}

/**
 * Claude API를 사용해 의미 기반 태그를 생성한다. (api 모드)
 * @param {string} promptText - 분석 대상 프롬프트
 * @param {string} apiKey - Anthropic API 키
 * @param {string} model - 사용할 모델 (비용 절약을 위해 haiku 권장)
 * @returns {Promise<string[]>} 추천 태그 배열
 */
async function suggestTagsApi(promptText, apiKey, model = 'claude-haiku-4-5-20251001') {
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
        max_tokens: 200,
        system: `프롬프트를 분석하여 적절한 태그를 최대 5개 반환하라.
도메인: #coding #writing #analysis #data #creative
용도: #summarize #translate #explain #generate #review
출력형식: #structured #list #json #prose #table
기술: #frontend #backend #infra #gamedev
JSON 배열로만 반환: ["#tag1", "#tag2"]`,
        messages: [{ role: 'user', content: promptText }]
      })
    });

    if (!response.ok) {
      // API 실패 시 local fallback
      return suggestTagsLocal(promptText);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '[]';

    // JSON 배열 파싱 시도
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const tags = JSON.parse(jsonMatch[0]);
      if (Array.isArray(tags)) {
        return tags.filter(t => typeof t === 'string').slice(0, 5);
      }
    }

    return suggestTagsLocal(promptText);
  } catch {
    // 네트워크 오류 등 → local fallback
    return suggestTagsLocal(promptText);
  }
}

export { suggestTagsLocal, suggestTagsApi, TAG_RULES };
