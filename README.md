# 게젤샤프트 (Gesellschaft)

바탕화면 위에 상주하는 오버레이 데스크톱 유틸리티

---

## 개요

게젤샤프트는 단축키 한 번으로 화면 위에 나타나는 투명 오버레이 앱입니다.
중앙의 허브 버튼을 누르면 카드 형태로 A-Z 26가지 도구가 펼쳐지고,
AI가 현재 화면을 분석해 필요한 기능을 자동으로 추천합니다.

8가지 테마 프리셋으로 앱의 분위기를 완전히 바꿀 수 있습니다.

---

## 주요 기능

### 오버레이 인터페이스
- **글로벌 단축키** (기본: `Ctrl+Shift+G`) --- OS 어디서든 즉시 토글
- **카드 팬 메뉴** --- A-Z 26개 도구, 좌우 회전 탐색
- **실시간 검색** --- 메뉴 열린 상태에서 도구 이름 필터링 + 카테고리 칩
- **전체 보기** --- 그리드 레이아웃으로 전체 도구 + 즐겨찾기 한눈에
- **키보드 단축키** --- `?`로 도움말, `Home`/`End` 이동, 화살표 탐색

### AI 어시스턴트
- **화면 분석** --- 현재 바탕화면 스크린샷을 AI에 전송, 필요 도구 자동 추천
- **AI 채팅** --- 각 도구 패널 내 AI 패널로 질문/작업 지원
- **멀티 프로바이더** --- OpenAI / Anthropic / Ollama 선택 가능

### 내장 도구 (26종, A-Z)

| 도구 | 설명 |
|------|------|
| **AI Assistant** | 화면 분석, 질문, 문서 작성, 요약, 번역 |
| **Batch** | 여러 파일의 이름을 규칙에 맞춰 일괄 변경 |
| **Clipboard** | 복사한 내용을 자동으로 기록하고 재사용 |
| **Diff** | 두 텍스트를 나란히 비교하고 차이점 강조 |
| **Excel / CSV** | Excel/CSV 파일 열기, 필터, 내보내기 |
| **Finder** | 컴퓨터 파일을 빠르게 검색하고 바로 열기 |
| **Generator** | 안전한 비밀번호와 랜덤 숫자를 즉시 생성 |
| **Haste** | 텍스트 공백/줄바꿈 정리, 중복 제거, 정렬 |
| **Image Tools** | OCR 텍스트 인식, 이미지 변환, QR코드 |
| **Jot** | 임시 메모패드, 창을 닫으면 자동으로 사라짐 |
| **Keyboard** | 단축키 목록 조회 및 커스텀 매크로 설정 |
| **Launcher** | 자주 쓰는 앱, 폴더, URL을 빠르게 실행 |
| **Memo & Alarm** | 빠른 메모 작성과 시간 기반 리마인더 |
| **Notepin** | 화면 위에 떠다니는 메모를 고정 |
| **Organizer** | 할일 목록, 템플릿, 상용구 통합 관리 |
| **PDF Tools** | PDF 합치기, 나누기, 페이지 편집 |
| **Quick Calc** | 수식을 입력하면 즉시 계산 결과 |
| **Ruler** | 화면 위 요소의 픽셀 크기와 거리 측정 |
| **Stopwatch** | 타이머, 포모도로, 스톱워치, 휴식 알림 |
| **Type** | 특수문자, 화살표, 수학기호, 이모지 빠른 입력 |
| **Upload** | 파일 크기, 형식, 해상도를 업로드 전에 확인 |
| **Vault** | 비밀번호와 중요 메모를 안전하게 보관 |
| **Whiteboard** | 화면 위에 자유롭게 펜으로 그리고 표시 |
| **X-Color** | 화면에서 색상 추출, 팔레트 만들기 |
| **Your Info** | 내 PC의 IP주소, 저장공간, 메모리, OS 정보 |
| **Zone** | 화면을 영역별로 분할하고 창 배치를 관리 |

### 테마 시스템 (8종)

각 테마는 색상, 폰트, 카드 형태, 시계 스타일, 파티클, 장식, 애니메이션이 모두 다릅니다.

| 테마 | 컨셉 | 카드 | 시계 |
|------|------|------|------|
| **Library of Ruina** | 고전 서재 | 책 | 앤티크 |
| **Crimson Night** | 붉은 야경 | 팔각형 | 지옥불 |
| **Violet Dream** | 보라빛 꿈 | 육각형 | 크리스탈 |
| **Arctic Blue** | 극지방 | 물방울 | 서리 |
| **Emerald Forest** | 숲속 | 잎사귀 | 자연 |
| **Rose Quartz** | 장미 수정 | 원형 | 우아함 |
| **Monochrome** | 흑백 | 둥근 사각 | 디지털 |
| **Sunset Amber** | 석양 | 둥근 사각 | 태양 |

### 설정
- **테마** --- 8가지 프리셋, 테마별 고유 폰트/색상/형태
- **화면** --- 허브 크기, 오버레이 불투명도, 나선 간격, 애니메이션 속도 (끄기 가능)
- **단축키** --- 글로벌 단축키 자유 지정
- **AI 연결** --- 프로바이더/API 키/모델/시스템 프롬프트 설정

---

## 개발

```bash
npm install
npm run dev
```

### 테스트

```bash
npm test          # 278개 테스트 실행
```

### 빌드

```bash
npm run build              # 프로덕션 빌드
npm run package            # Windows 설치형 (NSIS)
npm run package:portable   # 포터블 (AppImage + zip)
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Electron 35, React 18, TypeScript |
| 빌드 | electron-vite, electron-builder |
| 상태 관리 | Zustand |
| 스타일 | Tailwind CSS + CSS Variables + 인라인 테마 토큰 |
| 검증 | Zod (런타임), TypeScript (컴파일 타임) |
| 테스트 | Jest (14 suites, 278 tests) |
| 보안 | sandbox, contextIsolation, CSP, safeStorage |
| 폰트 | Google Fonts (10종: Cinzel Decorative, Playfair Display, Cormorant Garamond, Raleway, Merriweather, Lora, JetBrains Mono, Noto Serif KR, Nanum Myeongjo, Nanum Gothic) |

---

## 프로젝트 구조

```
src/
  main/           # Electron 메인 프로세스 (IPC 핸들러, 파일 시스템, AI, PDF 등)
  preload/         # contextBridge API (타입 안전 IPC)
  renderer/src/
    components/    # React 컴포넌트 (130+ 모달, 허브, 메뉴, 설정)
    utils/         # 테마 시스템, 공유 훅, 스타일, 로거, 수식 파서, HTML 새니타이저
    store/         # Zustand 앱 상태
    styles/        # 글로벌 CSS, 키프레임 애니메이션
  shared/          # 메인/렌더러 공유 (도구 정의, 타입, 유틸)
tests/
  main/            # 메인 프로세스 테스트
  renderer/        # 렌더러 유틸 테스트 (테마, 훅, 수식, 새니타이저)
  shared/          # 공유 모듈 테스트 (상수, 유틸)
```

---

## 새 도구 추가 방법

1. `src/shared/constants.ts`의 `ALL_TOOLS` 배열에 도구 정의 추가
2. `src/renderer/src/components/`에 `XxxModal.tsx` 컴포넌트 생성
3. `src/renderer/src/components/ToolPanel.tsx`의 `TOOL_REGISTRY`에 lazy import 추가

## 새 테마 추가 방법

1. `src/renderer/src/utils/theme.ts`의 `THEME_PRESETS` 배열에 프리셋 추가
2. `src/renderer/src/styles/globals.css`에 카드/허브 애니메이션 키프레임 추가
3. 필요시 Google Fonts import에 새 폰트 추가
