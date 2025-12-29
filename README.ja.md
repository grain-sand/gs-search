# gs-search

JavaScript/TypeScriptアプリケーション向けの軽量、高速、メモリ効率の良い全文検索エンジンです。

## 他の言語

- [中文 README](README.zh-CN.md)
- [English README](README.md)
- [한국어 README](README.ko.md)

## 特徴

- 🔍 **全文検索**（トークン化サポート付き）
- 📦 **軽量**（外部依存関係なし）
- ⚡ **高速**な検索パフォーマンス
- 📱 **ブラウザ & Node.js** サポート
- 🗄️ **カスタムストレージ**サポート
- 📊 **バッチ操作**（効率的なインデックス作成）

## インストール

```bash
# Yarnを使用する場合
yarn add gs-search

# npmを使用する場合
npm install gs-search
```

## クイックスタート

```typescript
import { SimpleSearch } from 'gs-search';

// 検索エンジンインスタンスを作成
const searchEngine = new SimpleSearch();

// ドキュメントを追加
await searchEngine.addDocuments([
  { id: 1, text: 'Hello world!' },
  { id: 2, text: 'This is a test document' },
  { id: 3, text: 'Another document for testing' }
]);

// 検索
const results = await searchEngine.search('test');
console.log(results);
// 出力: [{ id: 2, score: 1.5, tokens: ['test'] }, { id: 3, score: 1.5, tokens: ['test'] }]

// ドキュメントを削除
await searchEngine.deleteDocument(1);

// 検索エンジンのステータスを取得
const status = await searchEngine.getStatus();
console.log(status);
```

## 高度な使用方法

### SearchEngine

より細かい制御と高度な機能には、`SearchEngine`を使用します：

```typescript
import { SearchEngine, NodeStorage } from 'gs-search';

// カスタムストレージでエンジンを作成
const engine = new SearchEngine({
  storage: new NodeStorage('./search-data')
});

// エンジンを初期化
await engine.init();

// バッチ操作でドキュメントを追加
await engine.startBatch();
try {
  await engine.addDocuments([
    // ... ドキュメント
  ]);
} catch (error) {
  // エラー処理
} finally {
  // エラーが発生しても必ずバッチを終了し、インデックスが正しく再構築されるようにする
  await engine.endBatch();
}
```

### カスタムトークナイザ

特定の言語やトークン化の要件をサポートするために、カスタムトークナイザを設定できます。トークナイザは完全なドキュメントオブジェクトにアクセスできます：

```typescript
import { SearchEngine } from 'gs-search';

// カスタムインデックストークナイザ：ドキュメントの複数フィールドを使用
const indexingTokenizer = (doc: { id: string; text: string; category: string; author: string }): string[] => {
  // ドキュメントの全てのプロパティにアクセスできます
  const fullText = `${doc.text} ${doc.category} ${doc.author}`;
  return fullText.toLowerCase().split(/\s+/);
};

// カスタム検索トークナイザ：検索コンテキストをサポート
const searchTokenizer = (query: { text: string; language?: string; context?: string }): string[] => {
  // クエリの言語やコンテキストに応じてトークン化を調整できます
  const tokens = query.text.toLowerCase().split(/\s+/);
  // コンテキストに応じて追加の検索語を追加
  if (query.context === 'technical') {
    tokens.push('technical');
  }
  return tokens;
};

// カスタムトークナイザを設定してエンジンを作成
const engine = new SearchEngine({
  baseDir: 'search-data',
  indexingTokenizer,
  searchTokenizer
});
```

## APIリファレンス

### SimpleSearch

- `constructor()`: 新しい検索エンジンインスタンスを作成
- `addDocument(doc: IDocument): Promise<void>`: 単一のドキュメントを追加
- `addDocuments(docs: IDocument[]): Promise<void>`: 複数のドキュメントを追加
- `removeDocument(id: number): Promise<void>`: ドキュメントを削除
- `search(query: string, limit?: number): Promise<IResult[]>`: ドキュメントを検索
- `getStatus(): Promise<IStatus>`: 検索エンジンのステータスを取得

### CoreSearchEngine

- `constructor(options: ICoreSearchOptions)`: 新しいコアエンジンインスタンスを作成
- `init(): Promise<void>`: エンジンを初期化
- `addDocument(doc: IDocument): Promise<void>`: 単一ドキュメントを追加
- `addDocuments(docs: IDocument[]): Promise<void>`: 複数ドキュメントを追加
- `removeDocument(id: number): Promise<void>`: ドキュメントを削除
- `search(query: string, limit?: number): Promise<IResult[]>`: ドキュメントを検索
- `getStatus(): Promise<IStatus>`: 検索エンジンの状態を取得する
- `hasDocument(id: number): Promise<boolean>`: ドキュメントIDが追加されたことがあるかを確認（削除されたものも含む）
- `startBatch(): void`: バッチ操作を開始する
- `endBatch(): Promise<void>`: バッチ操作を終了

## ストレージ

検索エンジンはカスタムストレージ実装をサポートしています：

- `BrowserStorage`: ブラウザ環境用（IndexedDBを使用）
- `NodeStorage`: Node.js環境用（ファイルシステムを使用）

## ライセンス

MIT License

## リンク

- [GitHubリポジトリ](https://github.com/grain-sand/gs-search)
- [npmパッケージ](https://www.npmjs.com/package/gs-search)
