/**
 * 存储层接口 (外部化)
 */
export interface IStorage {
    write(filename: string, data: ArrayBuffer): Promise<void>;
    append(filename: string, data: ArrayBuffer): Promise<void>;
    read(filename: string): Promise<ArrayBuffer | null>;
    readRange(filename: string, start: number, end: number): Promise<ArrayBuffer | null>;
    remove(filename: string): Promise<void>;
    listFiles(): Promise<string[]>;
    clearAll(): Promise<void>;
    getFileSize(filename: string): Promise<number>;
}
