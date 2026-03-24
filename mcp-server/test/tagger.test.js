import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { suggestTagsLocal, TAG_RULES } from '../lib/tagger.js';

describe('Tagger — Local Rules', () => {
  it('should detect coding tags from code-related prompts', () => {
    const tags = suggestTagsLocal('Python으로 함수를 구현해줘');
    assert.ok(tags.includes('#coding'), `Expected #coding in ${JSON.stringify(tags)}`);
  });

  it('should detect translate tag', () => {
    const tags = suggestTagsLocal('이 문장을 영어로 번역해줘');
    assert.ok(tags.includes('#translate'), `Expected #translate in ${JSON.stringify(tags)}`);
  });

  it('should detect summarize tag', () => {
    const tags = suggestTagsLocal('이 문서를 요약해줘');
    assert.ok(tags.includes('#summarize'), `Expected #summarize in ${JSON.stringify(tags)}`);
  });

  it('should detect structured output tags', () => {
    const tags = suggestTagsLocal('JSON 형식으로 API 스키마를 만들어줘');
    assert.ok(tags.includes('#structured'), `Expected #structured in ${JSON.stringify(tags)}`);
  });

  it('should detect backend tags', () => {
    const tags = suggestTagsLocal('Express로 REST API 서버를 만들어줘');
    assert.ok(tags.includes('#backend'), `Expected #backend in ${JSON.stringify(tags)}`);
  });

  it('should detect frontend tags', () => {
    const tags = suggestTagsLocal('React 컴포넌트를 Tailwind CSS로 스타일링해줘');
    assert.ok(tags.includes('#frontend'), `Expected #frontend in ${JSON.stringify(tags)}`);
  });

  it('should return max 5 tags', () => {
    // 모든 키워드를 포함하는 긴 프롬프트
    const tags = suggestTagsLocal('코드 요약 번역 json 표 분석 data react express aws unity 생성 설명 리뷰 글');
    assert.ok(tags.length <= 5, `Expected at most 5 tags, got ${tags.length}`);
  });

  it('should return empty for unrecognizable prompts', () => {
    const tags = suggestTagsLocal('안녕하세요');
    assert.ok(tags.length === 0, `Expected empty tags, got ${JSON.stringify(tags)}`);
  });

  it('should be case-insensitive', () => {
    const tags = suggestTagsLocal('Write a Python FUNCTION');
    assert.ok(tags.includes('#coding'), `Expected #coding for uppercase input`);
  });

  it('should sort by hit count (more keyword matches first)', () => {
    // "코드 함수 구현 클래스" → #coding 4 hits, "분석 비교" → #analysis 2 hits
    const tags = suggestTagsLocal('코드 함수 구현 클래스 알고리즘 분석 비교');
    assert.equal(tags[0], '#coding', `Expected #coding first, got ${tags[0]}`);
  });

  it('should not produce duplicate tags', () => {
    const tags = suggestTagsLocal('code function implement class algorithm');
    const unique = new Set(tags);
    assert.equal(tags.length, unique.size, 'Tags should be unique');
  });
});
