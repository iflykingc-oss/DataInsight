'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Database as SqlDatabase } from 'sql.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Play,
  Save,
  Clock,
  Database,
  Table2,
  Trash2,
  BarChart3,
  Download,
  Loader2,
  ChevronRight,
  FileJson,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ParsedData } from '@/lib/data-processor';
import initSqlJs from 'sql.js';
import type { SqlJsStatic, SqlValue } from 'sql.js';

// ============================================
// 类型定义
// ============================================
interface SqlLabProps {
  data: ParsedData;
  className?: string;
}

interface QueryHistory {
  id: string;
  sql: string;
  timestamp: number;
  duration: number;
  rowCount: number;
  success: boolean;
  error?: string;
}

interface TableSchema {
  name: string;
  columns: Array<{ name: string; type: string }>;
  rowCount: number;
}

// ============================================
// 组件
// ============================================
export function SqlLab({ data, className }: SqlLabProps) {
  const { t } = useI18n();
  const [sql, setSql] = useState('SELECT * FROM data LIMIT 10;');
  const [results, setResults] = useState<Array<Record<string, unknown>> | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<QueryHistory[]>([]);
  const [activeTab, setActiveTab] = useState('query');
  const [db, setDb] = useState<SqlDatabase | null>(null);
  const [schemas, setSchemas] = useState<TableSchema[]>([]);
  const [selectedTable, setSelectedTable] = useState('data');
  const [executionTime, setExecutionTime] = useState(0);
  const SQLRef = useRef<SqlJsStatic | null>(null);

  // 加载 SQL.js 并初始化内存数据库
  useEffect(() => {
    let isMounted = true;

    const initDb = async () => {
      try {
        const SQL = await initSqlJs({
          locateFile: (file: string) => `/${file}`
        });
        if (!isMounted) return;
        SQLRef.current = SQL;

        const database = new SQL.Database();

        // 创建数据表
        if (data?.headers?.length > 0 && data?.rows?.length > 0) {
          createTable(database, 'data', data.headers, data.rows);
        }

        setDb(database);
        updateSchemas(database);
      } catch (err) {
        console.error('SQL.js 初始化失败:', err);
        // D-09 修复：WASM加载失败提供重试和降级提示
        const isWasmError = err instanceof Error && 
          (err.message.includes('wasm') || err.message.includes('WASM') || 
           err.message.includes('fetch') || err.message.includes('network'));
        if (isWasmError) {
          setError('SQL引擎(WASM)加载失败，可能是网络问题。请刷新页面重试，或检查浏览器是否支持WebAssembly。');
        } else {
          setError(`SQL引擎初始化失败: ${err instanceof Error ? err.message : '未知错误'}。请尝试刷新页面。`);
        }
      }
    };

    initDb();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // 创建表
  const createTable = (
    database: SqlDatabase,
    tableName: string,
    headers: string[],
    rows: Array<Record<string, unknown>>
  ) => {
    // 清理列名（SQLite 标识符规则）
    const cleanHeaders = headers.map(h =>
      h.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_')
    );

    // 推断列类型
    const columnTypes = headers.map((header, idx) => {
      const values = rows.map(r => r[header]).filter(v => v !== null && v !== undefined && v !== '');
      if (values.length === 0) return 'TEXT';

      const allNumbers = values.every(v => !isNaN(Number(v)) && v !== '');
      if (allNumbers) {
        const hasFloat = values.some(v => String(v).includes('.'));
        return hasFloat ? 'REAL' : 'INTEGER';
      }

      // 检查是否是日期
      const datePattern = /^\d{4}[-/]\d{2}[-/]\d{2}/;
      const allDates = values.every(v => datePattern.test(String(v)));
      if (allDates) return 'TEXT'; // SQLite 没有原生 DATE 类型

      return 'TEXT';
    });

    const columnDefs = cleanHeaders.map((h, i) => `"${h}" ${columnTypes[i]}`).join(', ');

    // 删除已存在的表
    try {
      database.exec(`DROP TABLE IF EXISTS "${tableName}"`);
    } catch { /* ignore */ }

    // 创建表
    database.exec(`CREATE TABLE "${tableName}" (${columnDefs})`);

    // 插入数据
    const insertSql = `INSERT INTO "${tableName}" (${cleanHeaders.map(h => `"${h}"`).join(', ')}) VALUES (${cleanHeaders.map(() => '?').join(', ')})`;
    const stmt = database.prepare(insertSql);

    for (const row of rows) {
      const params = headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return null;
        const num = Number(val);
        return !isNaN(num) && val !== '' ? num : String(val);
      });
      stmt.run(params);
    }
    stmt.free();
  };

  // 更新表结构信息
  const updateSchemas = (database: SqlDatabase) => {
    try {
      const result = database.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      const tableNames = result[0]?.values.map(v => String(v[0])) || [];

      const newSchemas: TableSchema[] = tableNames.map(name => {
        const info = database.exec(`PRAGMA table_info("${name}")`);
        const columns = info[0]?.values.map(v => ({
          name: String(v[1]),
          type: String(v[2]),
        })) || [];

        const countResult = database.exec(`SELECT COUNT(*) FROM "${name}"`);
        const rowCount = Number(countResult[0]?.values[0]?.[0] || 0);

        return { name, columns, rowCount };
      });

      setSchemas(newSchemas);
    } catch (err) {
      console.error('获取表结构失败:', err);
    }
  };

  // 执行 SQL
  const handleExecute = useCallback(async () => {
    if (!db || !sql.trim()) return;

    setIsExecuting(true);
    setError(null);
    setResults(null);
    const startTime = performance.now();

    try {
      const trimmedSql = sql.trim();

      // 禁止危险操作
      const dangerous = ['DROP DATABASE', 'ATTACH', 'DETACH', 'PRAGMA writable_schema'];
      if (dangerous.some(d => trimmedSql.toUpperCase().includes(d))) {
        throw new Error('该操作已被禁用');
      }

      const result = db.exec(trimmedSql);
      const duration = performance.now() - startTime;
      setExecutionTime(duration);

      if (result.length === 0) {
        // INSERT/UPDATE/DELETE 等无返回结果的操作
        setColumns([]);
        setResults([]);
      } else {
        const firstResult = result[0];
        setColumns(firstResult.columns.map(String));

        const rowData = firstResult.values.map(row => {
          const obj: Record<string, unknown> = {};
          firstResult.columns.forEach((col, i) => {
            obj[String(col)] = row[i];
          });
          return obj;
        });
        setResults(rowData);
      }

      // 添加到历史
      const historyEntry: QueryHistory = {
        id: `query-${Date.now()}`,
        sql: trimmedSql,
        timestamp: Date.now(),
        duration,
        rowCount: result[0]?.values.length || 0,
        success: true,
      };
      setHistory(prev => [historyEntry, ...prev].slice(0, 50));

      // 更新表结构（如果是DDL）
      const ddlKeywords = ['CREATE', 'ALTER', 'DROP'];
      if (ddlKeywords.some(k => trimmedSql.toUpperCase().startsWith(k))) {
        updateSchemas(db);
      }
    } catch (err) {
      const duration = performance.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : '查询执行失败';
      setError(errorMsg);

      const historyEntry: QueryHistory = {
        id: `query-${Date.now()}`,
        sql: sql.trim(),
        timestamp: Date.now(),
        duration,
        rowCount: 0,
        success: false,
        error: errorMsg,
      };
      setHistory(prev => [historyEntry, ...prev].slice(0, 50));
    } finally {
      setIsExecuting(false);
    }
  }, [db, sql]);

  // 加载历史查询
  const loadHistoryQuery = (entry: QueryHistory) => {
    setSql(entry.sql);
    setActiveTab('query');
  };

  // 删除历史记录
  const deleteHistory = (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  // 导出结果为 CSV
  const exportCSV = () => {
    if (!results || !columns.length) return;

    const csvContent = [
      columns.join(','),
      ...results.map(row =>
        columns.map(col => {
          const val = row[col];
          const str = val === null || val === undefined ? '' : String(val);
          return str.includes(',') ? `"${str}"` : str;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `query_result_${Date.now()}.csv`;
    link.click();
  };

  // 导出结果为 JSON
  const exportJSON = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `query_result_${Date.now()}.json`;
    link.click();
  };

  // 生成示例查询
  const generateExample = (type: string) => {
    const examples: Record<string, string> = {
      basic: 'SELECT * FROM data LIMIT 10;',
      count: 'SELECT COUNT(*) as 总记录数 FROM data;',
      sum: `SELECT SUM("${data.headers.find(h => h.toLowerCase().includes('额') || h.toLowerCase().includes('amount')) || data.headers[0]}") as 总计 FROM data;`,
      group: `SELECT "${data.headers[0]}", COUNT(*) as 数量 FROM data GROUP BY "${data.headers[0]}" LIMIT 20;`,
      filter: `SELECT * FROM data WHERE "${data.headers.find(h => h.toLowerCase().includes('额') || h.toLowerCase().includes('amount')) || data.headers[0]}" > 1000 LIMIT 10;`,
      sort: `SELECT * FROM data ORDER BY "${data.headers[0]}" DESC LIMIT 10;`,
      join: '-- 示例：关联查询（需要多个表）\nSELECT a.*, b.* FROM data a JOIN other_table b ON a.id = b.id;',
      aggregate: `SELECT \n  COUNT(*) as 记录数,\n  AVG("${data.headers.find(h => h.toLowerCase().includes('额') || h.toLowerCase().includes('amount')) || data.headers[0]}") as 平均值,\n  MAX("${data.headers.find(h => h.toLowerCase().includes('额') || h.toLowerCase().includes('amount')) || data.headers[0]}") as 最大值,\n  MIN("${data.headers.find(h => h.toLowerCase().includes('额') || h.toLowerCase().includes('amount')) || data.headers[0]}") as 最小值\nFROM data;`,
    };
    setSql(examples[type] || examples.basic);
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center space-y-4">
          <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">{error}</p>
          <div className="text-xs text-muted-foreground/60 space-y-1">
            <p>{t('txt.数据源上传的ExcelCSV文件会自动创建SQLi')}</p>
            <p>{t('txt.支持标准SQL语法SELECTJOINGROUPB')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            重新加载
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!db) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-muted-foreground mx-auto mb-3 animate-spin" />
          <p className="text-muted-foreground">{t('txt.正在加载SQL引擎')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          <h3 className="font-medium">SQL Lab</h3>
          <Badge variant="outline" className="text-xs">
            SQLite
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {results !== null && (
            <>
              <Button size="sm" variant="outline" onClick={exportCSV}>
                <Download className="w-3.5 h-3.5 mr-1" />
                CSV
              </Button>
              <Button size="sm" variant="outline" onClick={exportJSON}>
                <FileJson className="w-3.5 h-3.5 mr-1" />
                JSON
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-4">
        {/* 左侧：表结构和历史 */}
        <div className="space-y-4">
          {/* 表结构 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Table2 className="w-4 h-4" />
                数据表
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {schemas.map(schema => (
                <div key={schema.name}>
                  <button
                    className={cn(
                      'w-full flex items-center gap-2 text-sm font-medium p-2 rounded-md transition-colors',
                      selectedTable === schema.name
                        ? 'bg-primary/5 text-primary'
                        : 'hover:bg-muted/30'
                    )}
                    onClick={() => setSelectedTable(schema.name)}
                  >
                    <ChevronRight className={cn(
                      'w-3.5 h-3.5 transition-transform',
                      selectedTable === schema.name && 'rotate-90'
                    )} />
                    {schema.name}
                    <Badge variant="outline" className="text-xs ml-auto">
                      {schema.rowCount} 行
                    </Badge>
                  </button>
                  {selectedTable === schema.name && (
                    <div className="ml-6 mt-1 space-y-1">
                      {schema.columns.map(col => (
                        <div key={col.name} className="flex items-center justify-between text-xs text-muted-foreground py-0.5">
                          <span>{col.name}</span>
                          <Badge variant="outline" className="text-xs font-mono">
                            {col.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 查询历史 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                查询历史
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[300px] overflow-auto">
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">{t('txt.暂无查询记录')}</p>
              ) : (
                history.map(entry => (
                  <div
                    key={entry.id}
                    className="group flex items-start gap-2 p-2 rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <button
                      className="flex-1 text-left"
                      onClick={() => loadHistoryQuery(entry)}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {entry.success ? (
                          <CheckCircle2 className="w-3 h-3 text-success" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-destructive" />
                        )}
                        <span className="text-xs font-mono text-foreground truncate">
                          {entry.sql.slice(0, 40)}{entry.sql.length > 40 ? '...' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{entry.rowCount} 行</span>
                        <span>{entry.duration.toFixed(0)}ms</span>
                      </div>
                    </button>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/5 rounded transition-opacity"
                      onClick={() => deleteHistory(entry.id)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：查询和结果 */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="query">{t('txt.查询')}</TabsTrigger>
              <TabsTrigger value="results" disabled={results === null}>
                结果 {results !== null && `(${results.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="query" className="space-y-4">
              {/* SQL 编辑器 */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">SQL 编辑器</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t('txt.示例')}</span>
                      <Select onValueChange={generateExample}>
                        <SelectTrigger className="w-[140px] h-7 text-xs">
                          <SelectValue placeholder={t("ph.选择示例")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">{t('txt.基础查询')}</SelectItem>
                          <SelectItem value="count">{t('txt.计数统计')}</SelectItem>
                          <SelectItem value="sum">{t('txt.求和')}</SelectItem>
                          <SelectItem value="group">{t('txt.分组聚合')}</SelectItem>
                          <SelectItem value="filter">{t('txt.条件筛选')}</SelectItem>
                          <SelectItem value="sort">{t('txt.排序')}</SelectItem>
                          <SelectItem value="aggregate">{t('txt.综合统计')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <textarea
                    value={sql}
                    onChange={e => setSql(e.target.value)}
                    className="w-full h-40 p-3 font-mono text-sm bg-muted/30 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-primary"
                    placeholder={t("ph.输入SQL查询语句")}
                    spellCheck={false}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {error && (
                        <div className="flex items-center gap-1.5 text-xs text-destructive">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {error}
                        </div>
                      )}
                      {results !== null && !error && (
                        <div className="flex items-center gap-1.5 text-xs text-success">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          查询成功 ({executionTime.toFixed(0)}ms)
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={handleExecute}
                      disabled={isExecuting || !sql.trim()}
                    >
                      {isExecuting ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-1" />
                      )}
                      执行
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 快捷操作 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {[
                  { label: '查看全部', sql: 'SELECT * FROM data LIMIT 100;' },
                  { label: '统计行数', sql: 'SELECT COUNT(*) FROM data;' },
                  { label: '数值统计', sql: `SELECT COUNT(*), AVG("${data.headers.find(h => h.toLowerCase().includes('额') || h.toLowerCase().includes('amount')) || data.headers[0]}"), MAX("${data.headers.find(h => h.toLowerCase().includes('额') || h.toLowerCase().includes('amount')) || data.headers[0]}") FROM data;` },
                  { label: '去重计数', sql: `SELECT COUNT(DISTINCT "${data.headers[0]}") FROM data;` },
                ].map(item => (
                  <Button
                    key={item.label}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setSql(item.sql)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="results">
              {results !== null && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        查询结果
                        <Badge variant="outline" className="ml-2 text-xs">
                          {results.length} 行
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={exportCSV}>
                          <Download className="w-3.5 h-3.5 mr-1" />
                          CSV
                        </Button>
                        <Button size="sm" variant="outline" onClick={exportJSON}>
                          <FileJson className="w-3.5 h-3.5 mr-1" />
                          JSON
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {results.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        查询未返回任何数据
                      </p>
                    ) : (
                      <div className="overflow-auto max-h-[500px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {columns.map(col => (
                                <TableHead key={col} className="text-xs font-mono whitespace-nowrap">
                                  {col}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {results.slice(0, 100).map((row, i) => (
                              <TableRow key={i}>
                                {columns.map(col => (
                                  <TableCell key={col} className="text-xs">
                                    {row[col] === null || row[col] === undefined
                                      ? <span className="text-muted-foreground">NULL</span>
                                      : String(row[col])}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {results.length > 100 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            仅显示前 100 行，共 {results.length} 行
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default SqlLab;
