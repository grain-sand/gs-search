# gs-search

## 其他语言

- [English README](README.md)
- [日本語 README](README.ja.md)
- [한국어 README](README.ko.md)

可以在现代浏览器运行，且会自动存储索引的极小纯前端搜索库，可以配合其它强大的分词库使用效果更好

## 特性

- 🔍 **全文搜索** 支持多语言分词
- 📦 **轻量级** 无任何第三方依赖，体积小
- ⚡ **高性能** 快速搜索与索引构建
- 📱 **浏览器兼容** 支持现代浏览器
- 🌐 **多语言支持** 适配不同语言分词需求
- 🗄️ **自定义存储** 支持灵活的存储实现
- 📊 **批处理操作** 批量添加文档更高效

## 安装

```bash
# 使用yarn
yarn add gs-search

# 使用npm
npm install gs-search
```

## 快速开始

```typescript
import { SimpleSearch } from 'gs-search';

// 批量添加文档
await SimpleSearch.addDocuments([
  { id: 1, text: 'Hello world!' },
  { id: 2, text: '这是一个测试文档' },
  { id: 3, text: '另一个用于测试的文档' }
]);

// 添加单个文档
await SimpleSearch.addDocument({ id: 4, text: '单个文档添加示例' });

// 搜索
const results = await SimpleSearch.search('测试');
console.log(results);
// 输出: [{ id: 2, score: 1.5, tokens: ['测试'] }, { id: 3, score: 1.5, tokens: ['测试'] }]

// 删除文档
await SimpleSearch.removeDocument(1);

// 获取搜索引擎状态
const status = await SimpleSearch.getStatus();
console.log(status);
```

## 高级用法

### SearchEngine

如需更多控制和高级功能，可以使用 `SearchEngine`：

```typescript
import { SearchEngine, NodeStorage } from 'gs-search';

// 创建带有自定义存储的引擎
const engine = new SearchEngine({
  storage: new NodeStorage('./search-data')
});

// 初始化引擎
await engine.init();

// 批处理添加文档
await engine.startBatch();
try {
  await engine.addDocuments([
    // ... 文档
  ]);
  await engine.endBatch();
} catch (error) {
  // 处理错误
}
```

### 自定义存储

您可以实现自定义存储来持久化数据：

```typescript
import { StorageInterface } from 'gs-search';

class CustomStorage implements StorageInterface {
  async saveIndex(index: any): Promise<void> {
    // 保存索引到自定义存储
  }

  async loadIndex(): Promise<any | null> {
    // 从自定义存储加载索引
    return null;
  }

  async clear(): Promise<void> {
    // 清空存储
  }
}

// 使用自定义存储
const storage = new CustomStorage();
const engine = new SearchEngine({ storage });
```

### 事务支持

使用事务进行批量操作以提高性能：

```typescript
await engine.startTransaction();

try {
  // 批量添加文档
  for (let i = 0; i < 1000; i++) {
    await engine.addDocuments([{ id: i, text: `文档 ${i}` }]);
  }
  
  // 提交事务
  await engine.commitTransaction();
} catch (error) {
  // 回滚事务
  await engine.rollbackTransaction();
}
```

## 自定义分词器

您可以通过配置自定义分词器来支持特定的语言或分词需求。以下是一个简单的正则分词器示例，按空格和字符分词，且最长token不超过5字符：

```typescript
import { SimpleSearch } from 'gs-search';

// 自定义分词器：按空格和字符分词，最长token不超过5字符
const customTokenizer = (text: string): string[] => {
  // 按空格分词
  const tokens: string[] = [];
  const words = text.toLowerCase().split(/\s+/);
  
  // 对每个单词，按字符切分，最长不超过5字符
  for (const word of words) {
    if (word.length <= 5) {
      tokens.push(word);
    } else {
      // 超过5字符的单词按字符切分
      for (let i = 0; i < word.length; i++) {
        tokens.push(word[i]);
      }
    }
  }
  
  return tokens;
};

// 配置自定义分词器
SimpleSearch.configure({
  indexingTokenizer: customTokenizer,
  searchTokenizer: customTokenizer
});
```

## API参考

### SimpleSearch

**静态方法（无需创建实例）：**
- `configure(config: Partial<ISearchEngineConfig>): void`: 配置搜索引擎
- `addDocument(doc: IDocument): Promise<void>`: 添加单个文档
- `addDocuments(docs: IDocument[]): Promise<void>`: 批量添加文档
- `removeDocument(id: number): Promise<void>`: 删除文档
- `search(query: string, limit?: number): Promise<IResult[]>`: 搜索文档
- `getStatus(): Promise<IStatus>`: 获取搜索引擎状态
- `startBatch(): void`: 开始批处理操作
- `endBatch(): Promise<void>`: 结束批处理操作

### CoreSearchEngine

- `constructor(options: ICoreSearchOptions)`: 创建核心引擎实例
- `init(): Promise<void>`: 初始化引擎
- `addDocument(doc: IDocument): Promise<void>`: 添加单个文档
- `addDocuments(docs: IDocument[]): Promise<void>`: 批量添加文档
- `removeDocument(id: number): Promise<void>`: 删除文档
- `search(query: string, limit?: number): Promise<IResult[]>`: 搜索文档
- `getStatus(): Promise<IStatus>`: 获取搜索引擎状态
- `startBatch(): void`: 开始批处理
- `endBatch(): Promise<void>`: 结束批处理

## 存储支持

gs-search支持多种存储方式：

- **InMemoryStorage**：内存存储（默认）
- **LocalStorage**：浏览器本地存储
- **IndexedDBStorage**：浏览器IndexedDB存储
- **自定义存储**：实现StorageInterface接口

## 浏览器支持

- Chrome (最新)
- Firefox (最新)
- Safari (最新)
- Edge (最新)

## 许可证

[MIT License](LICENSE)

## 贡献

欢迎贡献代码！请查看[GitHub仓库](https://github.com/grain-sand/gs-search)了解更多信息。

## 联系方式

- [GitHub Repository](https://github.com/grain-sand/gs-search)
- [npm Package](https://www.npmjs.com/package/gs-search)
