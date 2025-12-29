# gs-search

JavaScript/TypeScript 애플리케이션을 위한 가볍고 빠르며 메모리 효율적인 전문 검색 엔진입니다.

## 다른 언어

- [中文 README](README.zh-CN.md)
- [English README](README.md)
- [日本語 README](README.ja.md)

## 기능

- 🔍 **전문 검색** 토큰화 지원
 - 📦 **가볍고** 외부 의존성 없음
- ⚡ **고속** 검색 성능
- 📱 **브라우저 & Node.js** 지원
- 🗄️ **커스텀 스토리지** 지원
- 📊 **일괄 작업** 효율적인 인덱싱

## 설치

```bash
# Yarn 사용
yarn add gs-search

# npm 사용
npm install gs-search
```

## 빠른 시작

```typescript
import { SimpleSearch } from 'gs-search';

// 검색 엔진 인스턴스 생성
const searchEngine = new SimpleSearch();

// 문서 추가
await searchEngine.addDocuments([
  { id: 1, text: 'Hello world!' },
  { id: 2, text: 'This is a test document' },
  { id: 3, text: 'Another document for testing' }
]);

// 검색
const results = await searchEngine.search('test');
console.log(results);
// 출력: [{ id: 2, score: 1.5, tokens: ['test'] }, { id: 3, score: 1.5, tokens: ['test'] }]

// 문서 삭제
await searchEngine.deleteDocument(1);

// 검색 엔진 상태 가져오기
const status = await searchEngine.getStatus();
console.log(status);
```

## 고급 사용법

### SearchEngine

보다 세밀한 제어와 고급 기능을 위해 `SearchEngine`를 사용하세요:

```typescript
import { SearchEngine, NodeStorage } from 'gs-search';

// 커스텀 스토리지로 엔진 생성
const engine = new SearchEngine({
  storage: new NodeStorage('./search-data')
});

// 엔진 초기화
await engine.init();

// 일괄 작업으로 문서 추가
await engine.startBatch();
try {
  await engine.addDocuments([
    // ... 문서
  ]);
} catch (error) {
  // 오류 처리
} finally {
  // 오류가 발생하더라도 항상 일괄 작업을 종료하여 인덱스가 올바르게 재구축되도록 합니다
  await engine.endBatch();
}
```

### 커스텀 토크나이저

특정 언어나 토크나이징 요구사항을 지원하기 위해 커스텀 토크나이저를 설정할 수 있습니다. 토크나이저는 전체 문서 객체에 액세스할 수 있습니다:

```typescript
import { SearchEngine } from 'gs-search';

// 커스텀 인덱스 토크나이저: 문서의 text와 category 필드를 사용
const indexingTokenizer = (doc: { id: string; text: string; category: string; author: string }): string[] => {
  // 문서의 모든 속성에 액세스할 수 있습니다
  const fullText = `${doc.text} ${doc.category} ${doc.author}`;
  return fullText.toLowerCase().split(/\s+/);
};

// 커스텀 검색 토크나이저: 검색 컨텍스트 지원
const searchTokenizer = (query: { text: string; language?: string; context?: string }): string[] => {
  // 쿼리의 언어나 컨텍스트에 따라 토크나이징을 조정할 수 있습니다
  const tokens = query.text.toLowerCase().split(/\s+/);
  // 컨텍스트에 따라 추가 검색어를 추가합니다
  if (query.context === 'technical') {
    tokens.push('technical');
  }
  return tokens;
};

// 커스텀 토크나이저를 설정하여 엔진 생성
const engine = new SearchEngine({
  baseDir: 'search-data',
  indexingTokenizer,
  searchTokenizer
});
```

## API 참조

### SimpleSearch

- `constructor()`: 새로운 검색 엔진 인스턴스 생성
- `addDocument(doc: IDocument): Promise<void>`: 단일 문서 추가
- `addDocuments(docs: IDocument[]): Promise<void>`: 여러 문서 추가
- `deleteDocument(id: number): Promise<void>`: 문서 삭제
- `search(query: string, limit?: number): Promise<IResult[]>`: 문서 검색
- `getStatus(): Promise<IStatus>`: 검색 엔진 상태 가져오기

### CoreSearchEngine

- `constructor(options: ICoreSearchOptions)`: 새로운 코어 엔진 인스턴스 생성
- `init(): Promise<void>`: 엔진 초기화
- `addDocument(doc: IDocument): Promise<void>`: 단일 문서 추가
- `addDocuments(docs: IDocument[]): Promise<void>`: 다중 문서 추가
- `removeDocument(id: number): Promise<void>`: 문서 삭제
- `search(query: string, limit?: number): Promise<IResult[]>`: 문서 검색
- `getStatus(): Promise<IStatus>`: 검색 엔진 상태 조회
- `hasDocument(id: number): Promise<boolean>`: 문서 ID가 추가된 적이 있는지 확인합니다 (삭제된 문서도 포함)
- `startBatch(): void`: 배치 작업 시작
- `endBatch(): Promise<void>`: 배치 작업 종료

## 스토리지

검색 엔진은 커스텀 스토리지 구현을 지원합니다:

- `BrowserStorage`: 브라우저 환경용 (IndexedDB 사용)
- `NodeStorage`: Node.js 환경용 (파일 시스템 사용)

## 라이선스

MIT License

## 링크

- [GitHub 리포지토리](https://github.com/grain-sand/gs-search)
- [npm 패키지](https://www.npmjs.com/package/gs-search)
