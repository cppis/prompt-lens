/**
 * session.js — 세션 컨텍스트 관리 (v0.5.1)
 *
 * MCP Server 프로세스 내 싱글톤 인메모리 상태.
 * stdio 단일 프로세스이므로 동시성 문제 없음.
 * 서버 재시작 시 초기화 — 영속성 저장 불필요.
 */

const session = {
  lastEntryId: null,
  lastProjectId: null,

  /**
   * 마지막으로 생성/분석된 entryId를 기록한다.
   * analyze_prompt, add_history_entry 응답 시 호출.
   */
  setLastEntry(entryId, projectId) {
    this.lastEntryId = entryId;
    if (projectId) {
      this.lastProjectId = projectId;
    }
  },

  /**
   * 세션 내 마지막 entryId를 반환한다.
   * >> re, >> v2, >> fix 트리거에서 parentId 자동 참조에 사용.
   * @returns {string} 마지막 entryId
   * @throws {Error} 세션 내 이전 분석 결과가 없을 때
   */
  getLastEntryId() {
    if (!this.lastEntryId) {
      throw new Error('세션 내 이전 분석 결과가 없습니다. 먼저 프롬프트를 분석해주세요.');
    }
    return this.lastEntryId;
  },

  /**
   * 세션 내 마지막 projectId를 반환한다.
   * @returns {string|null}
   */
  getLastProjectId() {
    return this.lastProjectId;
  },

  /**
   * 세션 상태를 초기화한다. (테스트용)
   */
  reset() {
    this.lastEntryId = null;
    this.lastProjectId = null;
  }
};

export { session };
