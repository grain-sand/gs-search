# gs-search

A lightweight, fast, and memory-efficient full-text search engine for JavaScript/TypeScript applications.

## Other Languages

- [中文 README](README.zh-CN.md)
- [日本語 README](README.ja.md)
- [한국어 README](README.ko.md)

## Features

- 🔍 **Full-text search** with tokenization support
- 📦 **Lightweight** with zero external dependencies
- ⚡ **Fast** search performance
- 📱 **Browser & Node.js** support
- 🗄️ **Custom storage** support
- 📊 **Batch operations** for efficient indexing

## Installation

```bash
# Using yarn
yarn add gs-search

# Using npm
npm install gs-search
```

## Quick Start

```typescript
import { SimpleSearch } from 'gs-search';

// Add documents in batch
await SimpleSearch.addDocuments([
  { id: 1, text: 'Hello world!' },
  { id: 2, text: 'This is a test document' },
  { id: 3, text: 'Another document for testing' }
]);

// Add a single document
await SimpleSearch.addDocument({ id: 4, text: 'Single document addition' });

// Search
const results = await SimpleSearch.search('test');
console.log(results);
// Output: [{ id: 2, score: 1.5, tokens: ['test'] }, { id: 3, score: 1.5, tokens: ['test'] }]

// Delete a document
await SimpleSearch.removeDocument(1);

// Get search engine status
const status = await SimpleSearch.getStatus();
console.log(status);
```

## Advanced Usage

### SearchEngine

For more control and advanced features, use the `SearchEngine`:

```typescript
import { SearchEngine, NodeStorage } from 'gs-search';

// Create engine with custom storage
const engine = new SearchEngine({
  storage: new NodeStorage('./search-data')
});

// Initialize engine
await engine.init();

// Add documents in batch
await engine.startBatch();
try {
  await engine.addDocuments([
    // ... documents
  ]);
} catch (error) {
  // Handle error
} finally {
  // Always end batch to ensure index rebuilds properly
  await engine.endBatch();
}
```

### Custom Tokenizers

You can configure custom tokenizers to support specific languages or tokenization requirements:

```typescript
import { SearchEngine, BrowserStorage } from 'gs-search';

// Custom tokenizer that splits by spaces and limits token length
const customTokenizer = (text: string): string[] => {
  // Split by whitespace
  const tokens: string[] = [];
  const words = text.toLowerCase().split(/\s+/);
  
  // Process each word, limiting token length to 5 characters
  for (const word of words) {
    if (word.length <= 5) {
      tokens.push(word);
    } else {
      // Split long words character by character
      for (let i = 0; i < word.length; i++) {
        tokens.push(word[i]);
      }
    }
  }
  
  return tokens;
};

// Create engine with custom tokenizers
const engine = new SearchEngine({
  baseDir: 'search-data',
  indexingTokenizer: customTokenizer,
  searchTokenizer: customTokenizer
});
```

## API Reference

### SimpleSearch

**Static Methods (No instance creation required):**
- `configure(config: Partial<ISearchEngineConfig>): void`: Configure the search engine
- `addDocument(doc: IDocument): Promise<void>`: Add a single document
- `addDocuments(docs: IDocument[]): Promise<void>`: Add multiple documents
- `addDocumentIfMissing(doc: IDocument): Promise<void>`: Add a single document if it doesn't exist
- `addDocumentsIfMissing(docs: IDocument[]): Promise<void>`: Add multiple documents, skipping existing ones
- `removeDocument(id: number): Promise<void>`: Delete a document
- `search(query: string, limit?: number): Promise<IResult[]>`: Search for documents
- `getStatus(): Promise<IStatus>`: Get search engine status
- `hasDocument(id: number): Promise<boolean>`: Checks if a document ID has been added (including deleted ones)
- `startBatch(): void`: Start batch operations
- `endBatch(): Promise<void>`: End batch operations

### SearchEngine

- `constructor(options: ISearchEngineConfig)`: Create a new core engine instance
- `init(): Promise<void>`: Initialize the engine
- `addDocument(doc: IDocument): Promise<void>`: Add a single document
- `addDocuments(docs: IDocument[]): Promise<void>`: Add multiple documents
- `addDocumentIfMissing(doc: IDocument): Promise<void>`: Add a single document if it doesn't exist
- `addDocumentsIfMissing(docs: IDocument[]): Promise<void>`: Add multiple documents, skipping existing ones
- `removeDocument(id: number): Promise<void>`: Delete a document
- `search(query: string, limit?: number): Promise<IResult[]>`: Search for documents
- `getStatus(): Promise<IStatus>`: Get search engine status
- `startBatch(): void`: Start batch operations
- `endBatch(): Promise<void>`: End batch operations

## Storage

The search engine supports custom storage implementations:

- `BrowserStorage`: For browser environments (uses IndexedDB)
- `NodeStorage`: For Node.js environments (uses file system)

## License

MIT License

## Links

- [GitHub Repository](https://github.com/grain-sand/gs-search)
- [npm Package](https://www.npmjs.com/package/gs-search)
