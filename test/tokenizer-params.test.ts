// noinspection TypeScriptUnresolvedReference

import {afterAll, beforeEach, describe, expect, it} from 'vitest';
import {IDocument, IDocumentBase, SearchEngine} from '../src';
import {MockStorage} from './common/storage';

describe('Tokenizer Parameters', () => {
  let engine: SearchEngine;
  // 保存所有创建的SearchEngine实例，用于清理
  const enginesToClean: SearchEngine[] = [];
  // 保存所有创建的MockStorage实例，用于清理
  const mockStorages: MockStorage[] = [];

  // 创建MockStorage实例的辅助函数
  const createMockStorage = () => {
    const storage = new MockStorage();
    mockStorages.push(storage);
    return storage;
  };

  beforeEach(() => {
    engine = new SearchEngine({
      storage: createMockStorage(),
    });
    enginesToClean.push(engine);
  });

  it('should pass full document object to indexingTokenizer', async () => {
    interface CustomDocument extends IDocument {
      category: string;
      author: string;
    }

    const capturedDocuments: CustomDocument[] = [];

    // 创建一个新的engine实例，配置自定义的indexingTokenizer
    const customEngine = new SearchEngine({
      storage: createMockStorage(),
      indexingTokenizer: (doc: CustomDocument) => {
        capturedDocuments.push(doc);
        return doc.text.split(' ');
      },
    });
    enginesToClean.push(customEngine);

    // 使用当前时间戳作为ID，确保唯一
    const uniqueId = Date.now();
    const testDoc: CustomDocument = {
      id: uniqueId,
      text: 'Hello world',
      category: 'test',
      author: 'test-author'
    };

    await customEngine.init();
    await customEngine.addDocument(testDoc);

    expect(capturedDocuments.length).toBe(1);
    expect(capturedDocuments[0]).toEqual(testDoc);
    expect(capturedDocuments[0]).toHaveProperty('id', uniqueId);
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
      storage: createMockStorage(),
      indexingTokenizer: (doc: CustomDocument) => {
        capturedDocuments.push(doc);
        return doc.text.split(' ');
      },
    });
    enginesToClean.push(customEngine);

    // 使用当前时间戳作为基础，为每个文档生成唯一ID
    const baseId = Date.now();
    const testDocs: CustomDocument[] = [
      {
        id: baseId,
        text: 'Hello world',
        tags: ['test'],
        priority: 1
      },
      {
        id: baseId + 1,
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
      storage: createMockStorage(),
      indexingTokenizer: (doc) => doc.text.split(' '),
      searchTokenizer: (query: CustomSearchDoc) => {
        capturedQueries.push(query);
        return query.text.split(' ');
      },
    });
    enginesToClean.push(customEngine);

    customEngine.addDocument({ id: Date.now(), text: 'Hello world' });

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
      storage: createMockStorage(),
      indexingTokenizer: (doc) => doc.text.split(' '),
      searchTokenizer: (query: IDocumentBase) => {
        capturedQueries.push(query);
        return query.text.split(' ');
      },
    });
    enginesToClean.push(customEngine);

    await customEngine.addDocument({ id: Date.now(), text: 'Hello world' });
    await customEngine.search<any>('Hello');

    expect(capturedQueries.length).toBe(1);
    expect(capturedQueries[0]).toEqual({ text: 'Hello' });
  });

  afterAll(async () => {
    // 清理所有创建的SearchEngine实例的数据
    for (const engine of enginesToClean) {
      try {
        await engine.clearAll();
      } catch (e) {
        console.error('Failed to clear engine data:', e);
      }
    }
    
    // 清理所有MockStorage实例
    for (const storage of mockStorages) {
      try {
        await storage.clearAll();
      } catch (e) {
        console.error('Failed to clear MockStorage:', e);
      }
    }
  });
});
