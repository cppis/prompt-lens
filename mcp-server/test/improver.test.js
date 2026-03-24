import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateImprovedPrompt, runImprovementLoop } from '../lib/improver.js';

describe('Improver — generateImprovedPrompt (local)', () => {
  it('should add role when missing', async () => {
    const entry = {
      prompt: '로그인 폼 만들어줘',
      score: 30,
      axisScores: [40, 20, 30, 25, 35],
      missingElements: ['Role', 'Context', 'Output Format']
    };

    // API 키 없음 → local fallback
    const improved = await generateImprovedPrompt(entry, null);
    assert.ok(improved.includes('전문가'), `Expected role addition, got: ${improved}`);
    assert.ok(improved.includes('로그인 폼'), 'Should preserve original prompt');
  });

  it('should handle entry with no missing elements', async () => {
    const entry = {
      prompt: '당신은 시니어 개발자입니다. TypeScript로 작성해주세요.',
      score: 85,
      axisScores: [90, 80, 85, 80, 85],
      missingElements: []
    };

    const improved = await generateImprovedPrompt(entry, null);
    assert.ok(improved.includes('시니어 개발자'), 'Should preserve original prompt');
  });

  it('should add output format when missing', async () => {
    const entry = {
      prompt: '데이터를 분석해줘',
      score: 40,
      axisScores: [50, 30, 40, 35, 45],
      missingElements: ['output_format']
    };

    const improved = await generateImprovedPrompt(entry, null);
    assert.ok(improved.includes('출력 형식') || improved.includes('구조화'), 'Should add output format');
  });
});

describe('Improver — runImprovementLoop', () => {
  // Mock storage
  function createMockStorage(entries) {
    return {
      findEntryById: async (id) => entries[id] || null,
      addHistoryEntry: async (projectId, data) => {
        const newId = `h_loop_${Object.keys(entries).length}`;
        const entry = {
          id: newId,
          projectId,
          ...data,
          grade: data.score >= 90 ? 'A' : data.score >= 70 ? 'B' : data.score >= 50 ? 'C' : 'D',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1
        };
        entries[newId] = entry;
        return entry;
      }
    };
  }

  // Mock analyzePrompt: 매 호출마다 점수 20점 증가
  let callCount = 0;
  function mockAnalyze(prompt) {
    callCount++;
    const score = Math.min(30 + callCount * 20, 95);
    return {
      score,
      grade: score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D',
      axisScores: [score, score, score, score, score],
      missingElements: score < 70 ? ['output_format'] : [],
      enhancedPrompt: prompt + ' [enhanced]',
      summary: `Score: ${score}`
    };
  }

  // Mock improver
  async function mockImprove(entry) {
    return entry.prompt + ' [improved]';
  }

  it('should reach target score and stop', async () => {
    callCount = 0;
    const entries = {
      'h_start': {
        id: 'h_start', prompt: 'test prompt', score: 30, grade: 'D',
        axisScores: [30, 30, 30, 30, 30], missingElements: ['Role'],
        tags: ['test'], projectId: 'proj_1'
      }
    };

    const result = await runImprovementLoop('h_start', {
      targetScore: 85,
      maxIterations: 10,
      storage: createMockStorage(entries),
      analyzePrompt: mockAnalyze,
      generateImprovedPrompt: mockImprove,
      apiKey: null,
      model: 'test',
      projectId: 'proj_1',
      session: { setLastEntry: () => {} }
    });

    assert.equal(result.goalReached, true, 'Should reach goal');
    assert.ok(result.finalScore >= 85, `Final score ${result.finalScore} should be >= 85`);
    assert.ok(result.iterations <= 10, 'Should not exceed maxIterations');
  });

  it('should stop at maxIterations if target not reached', async () => {
    callCount = 0;
    const entries = {
      'h_start': {
        id: 'h_start', prompt: 'test', score: 10, grade: 'D',
        axisScores: [10, 10, 10, 10, 10], missingElements: ['Role', 'Context'],
        tags: ['test'], projectId: 'proj_1'
      }
    };

    // 매우 높은 목표를 설정하여 도달 불가능하게 함
    const result = await runImprovementLoop('h_start', {
      targetScore: 100,
      maxIterations: 2,
      storage: createMockStorage(entries),
      analyzePrompt: mockAnalyze,
      generateImprovedPrompt: mockImprove,
      apiKey: null,
      model: 'test',
      projectId: 'proj_1',
      session: { setLastEntry: () => {} }
    });

    assert.equal(result.goalReached, false, 'Should not reach goal');
    assert.equal(result.iterations, 2, 'Should stop at maxIterations');
  });

  it('should throw if start entry not found', async () => {
    const entries = {};

    await assert.rejects(
      () => runImprovementLoop('h_nonexistent', {
        targetScore: 85,
        maxIterations: 5,
        storage: createMockStorage(entries),
        analyzePrompt: mockAnalyze,
        generateImprovedPrompt: mockImprove,
        apiKey: null,
        model: 'test',
        projectId: 'proj_1',
        session: { setLastEntry: () => {} }
      }),
      /entry not found/
    );
  });

  it('should build version history chain', async () => {
    callCount = 0;
    const entries = {
      'h_start': {
        id: 'h_start', prompt: 'initial', score: 30, grade: 'D',
        axisScores: [30, 30, 30, 30, 30], missingElements: ['Role'],
        tags: ['test'], projectId: 'proj_1'
      }
    };

    const result = await runImprovementLoop('h_start', {
      targetScore: 85,
      maxIterations: 10,
      storage: createMockStorage(entries),
      analyzePrompt: mockAnalyze,
      generateImprovedPrompt: mockImprove,
      apiKey: null,
      model: 'test',
      projectId: 'proj_1',
      session: { setLastEntry: () => {} }
    });

    assert.ok(result.history.length >= 2, 'Should have version history');
    // 점수가 증가하는 추세 확인
    for (let i = 1; i < result.history.length; i++) {
      assert.ok(
        result.history[i].score >= result.history[i - 1].score,
        `Score should increase: ${result.history[i - 1].score} → ${result.history[i].score}`
      );
    }
  });
});
