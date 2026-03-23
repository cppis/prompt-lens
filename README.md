# PromptLens — Getting Started

> 5분 안에 PromptLens를 설치하고 첫 프롬프트를 분석해봅니다.

---

## 준비물

- **Node.js 18 이상** — [다운로드](https://nodejs.org/)
- **Claude Desktop** 또는 **Claude Code** — [Claude Desktop 다운로드](https://claude.ai/download)

---

## Step 1. MCP 서버 등록

PromptLens를 Claude에 연결하는 단계입니다. 개발 중인 소스를 사용하는 방법과 npm 배포판을 사용하는 방법이 있습니다.

### 방법 A: 소스에서 직접 실행 (개발용)

```bash
git clone https://github.com/cppis/prompt-lens.git
cd prompt-lens/mcp-server
npm install
```

자동 설정 스크립트를 실행하면 Claude Desktop에 PromptLens가 등록됩니다:

```bash
./scripts/setup-claude-desktop.sh
```

스크립트가 OS를 감지하여 `claude_desktop_config.json`에 자동 등록합니다. 기존 MCP 설정은 유지됩니다.

**Claude Code를 사용하는 경우:**

```bash
claude mcp add promptlens node /your/path/to/prompt-lens/mcp-server/index.js
```

<details>
<summary>수동 설정 (자동 스크립트 대신 직접 config 편집)</summary>

| OS | config 파일 경로 |
|------|-----------------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

```json
{
  "mcpServers": {
    "promptlens": {
      "command": "node",
      "args": ["/your/path/to/prompt-lens/mcp-server/index.js"]
    }
  }
}
```

> `/your/path/to/` 부분을 실제 clone한 경로로 바꿔주세요. 설정 후 Claude Desktop을 재시작합니다.
</details>

### 방법 B: npx로 실행 (npm 배포 후)

npm에 publish된 후에는 소스 clone 없이 바로 사용할 수 있습니다.

```json
{
  "mcpServers": {
    "promptlens": {
      "command": "npx",
      "args": ["-y", "promptlens-mcp"]
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add promptlens -- npx -y promptlens-mcp
```

---

## Step 2. Claude Desktop 재시작

config 파일을 저장한 후 **Claude Desktop을 완전히 종료하고 다시 실행**합니다.

정상적으로 등록되면 Claude Desktop 입력창 우측 하단에 MCP 도구 아이콘(🔧)이 나타나고, `promptlens`가 목록에 보입니다.

**확인 방법 (Claude Code):**

```bash
claude mcp list
```

출력에 `promptlens`가 있으면 성공입니다.

---

## Step 3. 첫 프롬프트 분석

Claude Desktop 대화창에서 프롬프트 끝에 `>> anz` (한글: `>> 분석`)을 붙이면 자동으로 분석됩니다:

```
React로 로그인 폼 만들어줘 >> anz
```

```
React로 로그인 폼 만들어줘 >> 분석
```

또는 자연어로 요청해도 됩니다:

```
"React로 로그인 폼 만들어줘"라는 프롬프트를 분석해줘
```

PromptLens가 자동으로 호출되어 분석 결과를 돌려줍니다:

```
📊 종합 점수: 43/100 (D등급)

5축 점수:
  - 명확성(Clarity): 55
  - 구체성(Specificity): 30
  - 맥락(Context): 35
  - 구조(Structure): 40
  - 실행성(Actionability): 50

❌ 누락된 요소: Role, Context, Output Format, Example, Constraints

💡 개선 제안:
  - 역할을 지정하세요 (예: "너는 시니어 React 개발자야")
  - 로그인 폼의 구체적 요구사항을 명시하세요
  - 원하는 출력 형식을 지정하세요

✨ 개선된 프롬프트:
  "너는 시니어 React 개발자야. TypeScript 기반의 로그인 폼 컴포넌트를 만들어줘.
   이메일/비밀번호 입력, 유효성 검증, 에러 메시지 표시를 포함하고,
   Tailwind CSS로 스타일링해줘. 코드와 함께 사용법을 설명해줘."
```

---

## Step 4. 프로젝트 만들기 (선택)

프롬프트 분석 기록을 프로젝트별로 관리할 수 있습니다.

```
PromptLens에 "웹 개발" 프로젝트를 만들어줘
```

프로젝트를 만든 후, 분석할 때 프로젝트에 저장할 수 있습니다:

```
"REST API 설계해줘"를 분석하고 "웹 개발" 프로젝트에 저장해줘
```

나중에 기록을 확인하려면:

```
"웹 개발" 프로젝트의 히스토리를 보여줘
```

---

## Step 5. API 모드 활성화 (선택)

더 정밀한 분석이 필요하면 Anthropic API 키를 등록하여 API 모드를 사용할 수 있습니다.

### API 키 발급

1. [Anthropic Console](https://console.anthropic.com/)에 로그인
2. 좌측 메뉴에서 **API Keys** 선택
3. **Create Key** 클릭 → 이름 입력 → 생성
4. 생성된 키(`sk-ant-api03-...`)를 복사

### API 키 등록

Claude 대화에서:

```
PromptLens API 키를 설정해줘: sk-ant-api03-xxxxx
```

키가 자동으로 검증되고 로컬(`~/.promptlens/settings.json`)에 저장됩니다.

### API 모드로 분석

```
이 프롬프트를 API 모드로 분석해줘: "React로 로그인 폼 만들어줘"
```

API 모드는 3색 리포트를 제공합니다:

| 색상 | 의미 | 설명 |
|------|------|------|
| ✅ **Referenced** | 명시적 언급 | 프롬프트에 직접 적힌 정보 |
| 🟡 **Inferred** | AI 추론 | 명시하지 않았지만 AI가 추측하는 정보 (+ 신뢰도) |
| ❌ **Missing** | 누락 | 프롬프트에 없고 추론도 어려운 정보 |

> API 모드는 사용자의 API 키로 Claude API를 호출하므로 별도 비용이 발생합니다. 일상적 분석에는 무료인 local 모드를 권장합니다.

---

## 다음 단계

PromptLens의 모든 기능(9개 도구)에 대한 자세한 설명은 아래 문서를 참고하세요.

- [README](../README.md) — 전체 기능 요약, 설치 옵션, 사용법
- [사용 가이드](3.usage.md) — 도구별 파라미터, 시나리오별 사용법, FAQ
- [프로젝트 개요](0.overview.md) — 아키텍처, 로드맵

### 자주 쓰는 명령 모음

| 하고 싶은 것 | Claude에게 이렇게 말하세요 |
|-------------|---------------------------|
| 프롬프트 분석 (간단) | `... >> anz` 또는 `... >> 분석` |
| 프롬프트 분석 (자연어) | `"이 프롬프트를 분석해줘: ..."` |
| API 모드 분석 | `"API 모드로 분석해줘: ..."` |
| 프로젝트 생성 | `"PromptLens에 '프로젝트명' 프로젝트를 만들어줘"` |
| 프로젝트 목록 | `"PromptLens 프로젝트 목록을 보여줘"` |
| 히스토리 조회 | `"'프로젝트명' 히스토리를 보여줘"` |
| 대화 Import | `"conversations.json을 Import해줘"` |
| 통계 확인 | `"PromptLens 통계를 보여줘"` |
| 설정 확인 | `"PromptLens 설정을 보여줘"` |
| API 키 등록 | `"PromptLens API 키를 설정해줘: sk-ant-..."` |
