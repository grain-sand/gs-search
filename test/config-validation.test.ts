// noinspection TypeScriptUnresolvedReference

import { describe, it, expect } from 'vitest';
import { SearchEngine } from '../src';
import { getTestBaseDir } from './common/utils';

describe('Config Validation', () => {
    it('should throw error when minWordTokenSave >= wordSegmentTokenThreshold', () => {
        expect(() => {
            new SearchEngine({
                baseDir: getTestBaseDir('config-validation'),
                minWordTokenSave: 10,
                wordSegmentTokenThreshold: 5
            });
        }).toThrow('minWordTokenSave must be less than wordSegmentTokenThreshold');
    });

    it('should throw error when minCharTokenSave >= charSegmentTokenThreshold', () => {
        expect(() => {
            new SearchEngine({
                baseDir: getTestBaseDir('config-validation'),
                minCharTokenSave: 20,
                charSegmentTokenThreshold: 10
            });
        }).toThrow('minCharTokenSave must be less than charSegmentTokenThreshold');
    });

    it('should not throw error when minWordTokenSave < wordSegmentTokenThreshold', () => {
        expect(() => {
            new SearchEngine({
                baseDir: getTestBaseDir('config-validation'),
                minWordTokenSave: 5,
                wordSegmentTokenThreshold: 10
            });
        }).not.toThrow();
    });

    it('should not throw error when minCharTokenSave < charSegmentTokenThreshold', () => {
        expect(() => {
            new SearchEngine({
                baseDir: getTestBaseDir('config-validation'),
                minCharTokenSave: 10,
                charSegmentTokenThreshold: 20
            });
        }).not.toThrow();
    });
});
