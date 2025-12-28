# gs-search

## 다른 언어

- [中文 README](README.zh-CN.md)
- [English README](README.md)
- [日本語 README](README.ja.md)

JavaScript/TypeScript 애플리케이션을 위한 가볍고 빠르며 메모리 효율적인 전문 검색 엔진입니다.

## 기능

- 🔍 **전문 검색** 토큰화 지원
 - 📦 **가볍고** 외부 의존성 없음
- ⚡ **고속** 검색 성능
- 📱 **브라우저 & Node.js** 지원
- 🌐 **다국어** 토큰화
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

// 트랜잭션 내에서 문서 추가
await engine.beginTransaction();
try {
  await engine.addDocuments([
    // ... 문서
  ]);
  await engine.commit();
} catch (error) {
  await engine.rollback();
}
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
- `addDocuments(docs: IDocument[]): Promise<void>`: 여러 문서 추가
- `deleteDocument(id: number): Promise<void>`: 문서 삭제
- `search(query: string, limit?: number): Promise<IResult[]>`: 문서 검색
- `getStatus(): Promise<IStatus>`: 검색 엔진 상태 가져오기
- `beginTransaction(): void`: 트랜잭션 시작
- `commit(): Promise<void>`: 트랜잭션 커밋
- `rollback(): void`: 트랜잭션 롤백

## 스토리지

검색 엔진은 커스텀 스토리지 구현을 지원합니다:

- `BrowserStorage`: 브라우저 환경용 (IndexedDB 사용)
- `NodeStorage`: Node.js 환경용 (파일 시스템 사용)

## 라이선스

MIT License

## 링크

- [GitHub 리포지토리](https://github.com/grain-sand/gs-search)
- [npm 패키지](https://www.npmjs.com/package/gs-search)
