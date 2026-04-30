/**
 * 数据处理工具测试
 * 注意：此文件为占位测试文件，需要安装 vitest 并配置后才能运行
 * 运行测试：pnpm test
 */

// 模拟测试数据
const mockData = {
  headers: ['姓名', '年龄', '城市'],
  rows: [
    { '姓名': '张三', '年龄': 25, '城市': '北京' },
    { '姓名': '李四', '年龄': 30, '城市': '上海' },
    { '姓名': '王五', '年龄': 35, '城市': '北京' },
  ],
  rowCount: 3,
  columnCount: 3,
  fileName: 'test.csv',
};

// 测试用例（可使用 describe/it 进行组织）
const testCases = {
  dataIntegrity: {
    rowCount: () => mockData.rowCount === 3,
    columnCount: () => mockData.columnCount === 3,
    headersMatchColumnCount: () => mockData.headers.length === mockData.columnCount,
    rowsMatchRowCount: () => mockData.rows.length === mockData.rowCount,
  },
  dataTypeDetection: {
    identifyNumber: () => typeof mockData.rows[0]['年龄'] === 'number',
    identifyString: () => typeof mockData.rows[0]['姓名'] === 'string',
  },
};

export { mockData, testCases };
