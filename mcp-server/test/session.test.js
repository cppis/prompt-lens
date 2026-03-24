import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { session } from '../lib/session.js';

describe('Session Context', () => {
  beforeEach(() => {
    session.reset();
  });

  it('should start with null lastEntryId', () => {
    assert.equal(session.lastEntryId, null);
    assert.equal(session.lastProjectId, null);
  });

  it('should set and get lastEntryId', () => {
    session.setLastEntry('h_123_abc', 'proj_001');
    assert.equal(session.getLastEntryId(), 'h_123_abc');
    assert.equal(session.getLastProjectId(), 'proj_001');
  });

  it('should update lastEntryId on subsequent calls', () => {
    session.setLastEntry('h_111', 'proj_001');
    session.setLastEntry('h_222', 'proj_002');
    assert.equal(session.getLastEntryId(), 'h_222');
    assert.equal(session.getLastProjectId(), 'proj_002');
  });

  it('should throw when getLastEntryId is called with no previous entry', () => {
    assert.throws(() => session.getLastEntryId(), {
      message: /세션 내 이전 분석 결과가 없습니다/
    });
  });

  it('should keep projectId when setLastEntry is called without projectId', () => {
    session.setLastEntry('h_111', 'proj_001');
    session.setLastEntry('h_222', null);
    assert.equal(session.getLastEntryId(), 'h_222');
    // projectId는 null이 아닌 마지막 유효값 유지
    assert.equal(session.getLastProjectId(), 'proj_001');
  });

  it('should reset to initial state', () => {
    session.setLastEntry('h_111', 'proj_001');
    session.reset();
    assert.equal(session.lastEntryId, null);
    assert.equal(session.lastProjectId, null);
  });
});
