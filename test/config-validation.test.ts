// noinspection TypeScriptUnresolvedReference

import { describe, it, expect } from 'vitest';
import { SearchEngine } from '../src';
import { MockStorage } from './common/storage';

describe('Config Validation', () => {
    // 创建一个简单的MockStorage实例用于配置验证
    const createMockStorage = () => new MockStorage();

    it('should throw error when minWordTokenSave >= wordSegmentTokenThreshold', () => {
        expect(() => {
            new SearchEngine({
                storage: createMockStorage(),
                minWordTokenSave: 10,
                wordSegmentTokenThreshold: 5
            });
        }).toThrow('minWordTokenSave must be less than wordSegmentTokenThreshold');
    });

    it('should throw error when minCharTokenSave >= charSegmentTokenThreshold', () => {
        expect(() => {
            new SearchEngine({
                storage: createMockStorage(),
                minCharTokenSave: 20,
                charSegmentTokenThreshold: 10
            });
        }).toThrow('minCharTokenSave must be less than charSegmentTokenThreshold');
    });

    it('should not throw error when minWordTokenSave < wordSegmentTokenThreshold', () => {
        expect(() => {
            new SearchEngine({
                storage: createMockStorage(),
                minWordTokenSave: 5,
                wordSegmentTokenThreshold: 10
            });
        }).not.toThrow();
    });

    it('should not throw error when minCharTokenSave < charSegmentTokenThreshold', () => {
        expect(() => {
            new SearchEngine({
                storage: createMockStorage(),
                minCharTokenSave: 10,
                charSegmentTokenThreshold: 20
            });
        }).not.toThrow();
    });
});
