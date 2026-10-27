# Codex HUD

Codex CLI의 기본 상태줄을 설정하는 **설치형 플러그인**입니다. 모델·리즈닝 레벨, 프로젝트명, Git 브랜치, 컨텍스트 사용률과 사용 한도를 한 줄에 표시합니다.

설치 후 setup을 한 번 실행하면 일반 `codex` 명령에서 적용됩니다. 별도 HUD 실행기나 수정된 Codex 바이너리는 필요하지 않습니다. 현재 플러그인은 스킬과 설정 도우미로 구성되며, 화면은 Codex의 기본 렌더러가 그립니다.

## 요구 사항

- Codex CLI: 플러그인 설치와 기본 상태줄을 지원하는 버전. 검증 버전은 **0.164.0**입니다.
- Node.js 20 이상: setup·configure·restore 도우미 실행 시 사용합니다.
- Git 브랜치를 표시하려면 Git 저장소 안에서 Codex를 실행해야 합니다.

플러그인에 필요한 TOML 파서는 동봉되어 있어 `npm install`은 필요하지 않습니다. 외부 서버나 API 키도 필요하지 않습니다.

## 플러그인 설치

### GitHub 공개 후

저장소를 `NaStillmatic/codex-hud`로 공개한 뒤에는 다음 명령으로 설치할 수 있습니다. 아직 GitHub에 업로드하지 않은 상태입니다.

```sh
codex plugin marketplace add NaStillmatic/codex-hud
codex plugin add codex-hud@codex-hud
```

### 로컬 폴더에서 설치

GitHub 공개 전에도 이 저장소 폴더에서 설치할 수 있습니다.

```sh
cd /path/to/codex-hud
codex plugin marketplace add "$PWD"
codex plugin add codex-hud@codex-hud
```

두 방식 모두 마켓플레이스 이름과 플러그인 이름은 `codex-hud`이며 설치 식별자는 `codex-hud@codex-hud`입니다. 둘 중 한 방식만 사용하세요.

### 설치 후 설정

Codex의 `/plugins`에서 Codex HUD가 활성화되어 있는지 확인하고 **Setup**을 실행하세요. 또는 Codex 채팅에서 다음과 같이 요청할 수 있습니다.

```text
$codex-hud:setup 상태줄을 설정해줘
```

설정은 **다음 Codex CLI 실행부터** 적용됩니다. 현재 대화는 종료하지 않아도 되며, 바로 적용하려면 `/statusline`에서 같은 항목을 선택할 수 있습니다. Codex 데스크톱 채팅에는 CLI 상태줄이 표시되지 않습니다.

기본 항목 순서:

```text
모델·리즈닝 레벨 | 프로젝트 | Git 브랜치 | Context | 5시간·주간 한도 | 실행 상태 | 작업 진행률
```

실제 라벨과 구분자, 폭에 따른 생략은 Codex가 결정합니다. 리즈닝 레벨은 표시만 하며 모델 설정을 바꾸지 않습니다.

## 항목 변경

Codex에서 플러그인의 configure 스킬에 원하는 구성을 요청합니다.

```text
$codex-hud:configure 모델·리즈닝, 프로젝트명, 브랜치, Context만 순서대로 보여줘
```

항목 선택과 순서 변경, compact·balanced·full 프리셋, 상태줄 숨기기를 지원합니다. 그래프·두 줄 배치·입력창 구분선 옵션은 제공하지 않습니다.

| 프리셋 | 구성 |
| --- | --- |
| compact | 모델·리즈닝, Context, 사용 한도, 실행 상태 |
| balanced (기본값) | 모델·리즈닝, 프로젝트, Git 브랜치, Context, 사용 한도, 실행 상태, 작업 진행률 |
| full | balanced + 컨텍스트 창 크기, 사용·입력·출력 토큰 |

setup 스킬이 실행하는 도우미를 저장소에서 직접 실행할 수도 있습니다.

```sh
# 기본 구성 적용 / 현재 사용자 설정 확인
npm run setup
npm run status

# 지원 항목 목록
node scripts/configure.mjs fields

# 항목과 순서 지정
node scripts/configure.mjs apply --fields model-with-reasoning,project-name,git-branch,context-used

# 프리셋 적용 / 상태줄 숨기기
node scripts/configure.mjs apply --preset compact
node scripts/configure.mjs apply --fields none
```

지원 식별자:

| 식별자 | 표시 내용 |
| --- | --- |
| `model-with-reasoning` | 모델 이름과 리즈닝 레벨 |
| `project-name` | 프로젝트 이름 |
| `git-branch` | 현재 Git 브랜치 |
| `context-used` | 컨텍스트 사용률 (%) |
| `context-window-size` | 컨텍스트 창 크기 |
| `five-hour-limit` | 5시간 사용 한도 잔여량 |
| `weekly-limit` | 주간 사용 한도 잔여량 |
| `run-state` | 실행 상태 |
| `task-progress` | 체크리스트 진행률 |
| `used-tokens` | 사용 토큰 |
| `total-input-tokens` | 누적 입력 토큰 |
| `total-output-tokens` | 누적 출력 토큰 |

## 설정 보존과 제거

setup은 `${CODEX_HOME:-~/.codex}/config.toml`의 `tui.status_line`만 수정합니다. 다른 값과 주석은 보존하고, 파일이 변경되면 같은 폴더에 `config.toml.codex-hud-backup-*` 백업을 만듭니다. 최초 상태줄 설정은 `codex-hud-state.json`에 기록해 후속 재설정에도 유지합니다.

이전 상태줄로 되돌리려면 Codex에 `$codex-hud:configure 이전 상태줄로 복구해줘`라고 요청하거나 저장소에서 실행하세요.

```sh
npm run restore
```

플러그인을 제거할 때 상태줄도 되돌리려면 **restore를 먼저 실행**하세요. 플러그인 제거만으로 Codex의 저장 설정은 취소되지 않습니다.

```sh
codex plugin remove codex-hud@codex-hud
```

setup 이후 상태줄을 직접 수정했다면 restore는 그 값을 덮어쓰지 않고 중단합니다. 상태줄 외에 나중에 바꾼 설정은 복구 작업에서도 보존합니다. 복잡한 TOML 레이아웃을 안전하게 편집할 수 없으면 파일을 변경하지 않고 오류를 표시합니다.

## 문제 해결과 지원 범위

- **프로젝트·브랜치가 안 보임:** Git 저장소에서 `codex`를 실행하거나 `codex -C /path/to/repository`를 사용하세요. 현재 이 소스 폴더도 `.git`이 없으면 브랜치가 표시되지 않습니다. 저장된 항목에 `project-name`과 `git-branch`가 있는지도 확인하세요.
- **compact에서 프로젝트가 안 보임:** balanced를 적용하거나 원하는 항목을 직접 선택하세요.
- **사용 한도·진행률이 없음:** Codex가 제공하는 데이터만 표시됩니다. 작업 진행률은 세션의 `update_plan` 데이터가 있어야 합니다.
- **저장값과 화면이 다름:** 다시 실행한 CLI에 적용됩니다. 프로젝트 설정이나 실행 시 `-c tui.status_line=...` 옵션이 사용자 설정을 덮어쓸 수 있습니다.
- **그래프나 두 줄 HUD가 필요함:** 지원하지 않습니다. 이 플러그인은 Codex 기본 상태줄을 사용하며 Claude HUD의 사용자 지정 렌더러를 구현하지 않습니다. [확장 인터페이스 조사](research/plugin-compatibility.md)에 근거가 있습니다.

## 개발과 검증

```sh
npm test
npm run preview
```

`preview`는 예시 데이터이며 실시간 화면을 검증하지 않습니다. 테스트는 인자 전달과 종료 코드, 필드 검증, 저장 설정, TOML 보존, setup·재적용·restore 및 이후 수동 변경 보호를 검증합니다. 별도 임시 `CODEX_HOME`에서는 실제 플러그인 설치·활성화와 `skills/list`를 통한 `codex-hud:setup`, `codex-hud:configure` 인식을 확인했습니다. 모델에 프롬프트를 보내지는 않았습니다.

| 경로 | 역할 |
| --- | --- |
| `plugin.json` | Agent Plugins 형식의 플러그인 선언과 onboarding |
| `.claude-plugin/marketplace.json` | Codex가 지원하는 호환 형식의 로컬 마켓플레이스 카탈로그 |
| `skills/` | 설치 후 setup·configure 워크플로 |
| `scripts/configure.mjs` | 상태줄 적용·조회·복구 |
| `src/native-config.mjs` | TOML 검증과 상태줄만 보존 편집 |
| `src/hud.mjs` | 프리셋·항목·미리보기 |
| `vendor/` | 동봉 TOML 파서와 라이선스 |
| `test/` | Node.js 기본 테스트 러너로 실행하는 테스트 |

기존 `npm start`와 `bin/codex-hud.mjs`는 이전 실행기와의 호환용으로 유지합니다. 플러그인 사용에는 필요하지 않으며, 실행기를 사용하면 그 실행기의 옵션·저장값이 플러그인이 적용한 사용자 설정보다 우선합니다.

REA 조사 기록은 [research/rea-findings.md](research/rea-findings.md)에 있습니다. 플러그인 설치 방식은 [공식 패키징 문서](https://developers.openai.com/plugins/build/plugins)를 따릅니다.
