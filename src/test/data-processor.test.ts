import { describe, it, expect, beforeEach } from 'vitest';
import { parseFile } from '@/lib/data-processor';
import { analyzeData } from '@/lib/data-processor';

describe('数据处理服务', () => {
  describe('analyzeData', () => {
    it('应正确分析数据字段类型', () => {
      const mockData = {
        headers: ['name', 'age', 'active'],
        rows: [
          { name: '张三', age: 25, active: true },
          { name: '李四', age: 30, active: false },
        ],
        fileName: 'test.csv',
        rowCount: 2,
        columnCount: 3,
      };

      const result = analyzeData(mockData);

      expect(result.fieldStats).toHaveLength(3);
      expect(result.summary.totalRows).toBe(2);
      expect(result.summary.totalColumns).toBe(3);
    });

    it('应正确计算数值统计', () => {
      const mockData = {
        headers: ['value'],
        rows: [
          { value: 10 },
          { value: 20 },
          { value: 30 },
        ],
        fileName: 'numbers.csv',
        rowCount: 3,
        columnCount: 1,
      };

      const result = analyzeData(mockData);
      const valueStat = result.fieldStats.find(s => s.field === 'value');

      expect(valueStat?.numericStats?.sum).toBe(60);
      expect(valueStat?.numericStats?.mean).toBe(20);
      expect(valueStat?.numericStats?.min).toBe(10);
      expect(valueStat?.numericStats?.max).toBe(30);
    });

    it('应正确评估数据质量', () => {
      const mockData = {
        headers: ['name', 'value'],
        rows: [
          { name: 'A', value: 10 },
          { name: 'B', value: null },
          { name: 'C', value: 30 },
        ],
        fileName: 'with-nulls.csv',
        rowCount: 3,
        columnCount: 2,
      };

      const result = analyzeData(mockData);

      expect(result.qualityScore).toBeLessThan(100);
      expect(result.dataHealth.nullValueRatio).toBeGreaterThan(0);
    });
  });
});
