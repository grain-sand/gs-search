// noinspection TypeScriptUnresolvedReference

import {afterAll, beforeEach, describe, expect, it} from 'vitest';
import {IDocument, IDocumentBase, SearchEngine} from '../src';

function getTestBaseDir() {
  let workerId = '0';
  if (typeof process !== 'undefined' && process.env) {
    workerId = process.env.VITEST_POOL_ID || process.env.JEST_WORKER_ID || '0';
  }
  return `tokenizer_params_test_${workerId}`;
}

describe('Tokenizer Parameters', () => {
  let engine: SearchEngine;

  beforeEach(() => {
    engine = new SearchEngine({
      baseDir: getTestBaseDir(),
    });
  });

  it('should pass full document object to indexingTokenizer', async () => {
    interface CustomDocument extends IDocument {
      category: string;
      author: string;
    }

    const capturedDocuments: CustomDocument[] = [];

    // 创建一个新的engine实例，配置自定义的indexingTokenizer
    const customEngine = new SearchEngine({
      baseDir: getTestBaseDir() + '_1',
      indexingTokenizer: (doc: CustomDocument) => {
        capturedDocuments.push(doc);
        return doc.text.split(' ');
      },
    });

    const testDoc: CustomDocument = {
      id: 1,
      text: 'Hello world',
      category: 'test',
      author: 'test-author'
    };

    await customEngine.init();
    await customEngine.addDocument(testDoc);

    expect(capturedDocuments.length).toBe(1);
    expect(capturedDocuments[0]).toEqual(testDoc);
    expect(capturedDocuments[0]).toHaveProperty('id', '1');
    expect(capturedDocuments[0]).toHaveProperty('text', 'Hello world');
    expect(capturedDocuments[0]).toHaveProperty('category', 'test');
    expect(capturedDocuments[0]).toHaveProperty('author', 'test-author');
  });

  it('should pass full document object to indexingTokenizer in addDocuments', async () => {
    interface CustomDocument extends IDocument {
      tags: string[];
      priority: number;
    }

    const capturedDocuments: CustomDocument[] = [];

    // 创建一个新的engine实例，配置自定义的indexingTokenizer
    const customEngine = new SearchEngine({
      baseDir: getTestBaseDir() + '_2',
      indexingTokenizer: (doc: CustomDocument) => {
        capturedDocuments.push(doc);
        return doc.text.split(' ');
      },
    });

    const testDocs: CustomDocument[] = [
      {
        id: 1,
        text: 'Hello world',
        tags: ['test'],
        priority: 1
      },
      {
        id: 2,
        text: 'Another document',
        tags: ['test', 'another'],
        priority: 2
      }
    ];

    await customEngine.init();
    await customEngine.addDocuments(testDocs);

    expect(capturedDocuments.length).toBe(2);
    expect(capturedDocuments).toEqual(testDocs);
    capturedDocuments.forEach((doc, index) => {
      expect(doc).toHaveProperty('id', testDocs[index].id);
      expect(doc).toHaveProperty('text', testDocs[index].text);
      expect(doc).toHaveProperty('tags', testDocs[index].tags);
      expect(doc).toHaveProperty('priority', testDocs[index].priority);
    });
  });

  it('should pass full query object to searchTokenizer when using IDocumentBase', async () => {
    interface CustomSearchDoc extends IDocumentBase {
      searchContext: string;
      language: string;
    }

    const capturedQueries: CustomSearchDoc[] = [];

    // 创建一个新的engine实例，配置自定义的indexingTokenizer和searchTokenizer
    const customEngine = new SearchEngine({
      baseDir: getTestBaseDir() + '_3',
      indexingTokenizer: (doc) => doc.text.split(' '),
      searchTokenizer: (query: CustomSearchDoc) => {
        capturedQueries.push(query);
        return query.text.split(' ');
      },
    });

    customEngine.addDocument({ id: 1, text: 'Hello world' });

    const testQuery: CustomSearchDoc = {
      text: 'Hello',
      searchContext: 'general',
      language: 'en'
    };

    await customEngine.search(testQuery);

    expect(capturedQueries.length).toBe(1);
    expect(capturedQueries[0]).toEqual(testQuery);
    expect(capturedQueries[0]).toHaveProperty('text', 'Hello');
    expect(capturedQueries[0]).toHaveProperty('searchContext', 'general');
    expect(capturedQueries[0]).toHaveProperty('language', 'en');
  });

  it('should handle string queries with searchTokenizer', async () => {
    const capturedQueries: IDocumentBase[] = [];

    // 创建一个新的engine实例，配置自定义的indexingTokenizer和searchTokenizer
    const customEngine = new SearchEngine({
      baseDir: getTestBaseDir() + '_4',
      indexingTokenizer: (doc) => doc.text.split(' '),
      searchTokenizer: (query: IDocumentBase) => {
        capturedQueries.push(query);
        return query.text.split(' ');
      },
    });

    await customEngine.addDocument({ id: 1, text: 'Hello world' });
    await customEngine.search<any>('Hello');

    expect(capturedQueries.length).toBe(1);
    expect(capturedQueries[0]).toEqual({ text: 'Hello' });
  });

  afterAll(async () => {
    const base = getTestBaseDir();
    const dirsToClean = [base, base + '_1', base + '_2', base + '_3', base + '_4'];
    // 仅在 Node.js 环境中执行清理
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const fs = await import('node:fs');
        dirsToClean.forEach(d => {
          if (fs.existsSync(d)) {
            try {
              fs.rmSync(d, { recursive: true, force: true });
            } catch (e) {
              console.error(`Failed to cleanup test dir ${d}:`, e);
            }
          }
        });
      } catch (e) {
        // Ignore errors in non-Node environments
      }
    }
  });
});
