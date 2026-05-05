'use client';

import { useState, useMemo, useCallback } from 'react';
import { Table, Database, Link2, Plus, Trash2, Eye, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DataTable } from '@/components/data-table';
import type { ParsedData } from '@/lib/data-processor';
import { storeBusinessData, readBusinessData } from '@/lib/data-lifecycle';

interface TableRelation {
  id: string;
  sourceTable: string;
  sourceField: string;
  targetTable: string;
  targetField: string;
  displayFields: string[];
}

export interface LinkedTablesProps {
  tables: ParsedData[];
  activeTable: ParsedData | null;
  onTablesChange: (tables: ParsedData[]) => void;
  onActiveTableChange: (table: ParsedData) => void;
}

function buildEnrichedTable(baseTable: ParsedData, relations: TableRelation[], allTables: ParsedData[]): ParsedData {
  if (!baseTable || relations.length === 0) return baseTable;

  const newHeaders = [...baseTable.headers];
  const lookupConfigs: { header: string; targetTable: ParsedData; targetField: string; displayField: string; relationSourceField: string }[] = [];

  relations
    .filter(r => r.sourceTable === baseTable.fileName)
    .forEach(r => {
      const target = allTables.find(t => t.fileName === r.targetTable);
      if (!target) return;
      r.displayFields.forEach(df => {
        const lookupHeader = `${r.targetTable}.${df}`;
        if (!newHeaders.includes(lookupHeader)) {
          newHeaders.push(lookupHeader);
          lookupConfigs.push({
            header: lookupHeader,
            targetTable: target,
            targetField: r.targetField,
            displayField: df,
            relationSourceField: r.sourceField,
          });
        }
      });
    });

  const newRows = baseTable.rows.map(row => {
    const newRow = { ...row };
    lookupConfigs.forEach(cfg => {
      const sourceVal = row[cfg.relationSourceField];
      const targetRow = cfg.targetTable.rows.find(tr => String(tr[cfg.targetField]) === String(sourceVal));
      newRow[cfg.header] = targetRow ? targetRow[cfg.displayField] : null;
    });
    return newRow;
  });

  return {
    ...baseTable,
    headers: newHeaders,
    rows: newRows,
    columnCount: newHeaders.length,
  };
}

/** D-14 修复：智能推荐关联字段 - 基于字段名相似度匹配 */
function suggestRelationFields(sourceTable: ParsedData, targetTable: ParsedData): { sourceField: string; targetField: string; confidence: number }[] {
  const suggestions: { sourceField: string; targetField: string; confidence: number }[] = [];
  const commonIdPatterns = ['id', '_id', 'Id', 'ID', 'code', '_code', 'no', '_no', 'key', '_key', 'name', '_name'];

  for (const srcField of sourceTable.headers) {
    for (const tgtField of targetTable.headers) {
      const srcLower = srcField.toLowerCase();
      const tgtLower = tgtField.toLowerCase();

      // 精确匹配
      if (srcLower === tgtLower) {
        suggestions.push({ sourceField: srcField, targetField: tgtField, confidence: 1.0 });
        continue;
      }

      // ID关联模式: sourceTable的xxx_id 对应 targetTable的id或xxx_id
      for (const pattern of commonIdPatterns) {
        if (srcLower.endsWith(pattern) && tgtLower.endsWith(pattern)) {
          const srcPrefix = srcLower.slice(0, srcLower.length - pattern.length);
          const tgtPrefix = tgtLower.slice(0, tgtLower.length - pattern.length);
          // "user_id" ↔ "id" 或 "user_id" ↔ "user_id"
          if (tgtPrefix === '' || srcPrefix === tgtPrefix || 
              tgtLower === pattern && srcLower.startsWith(tgtPrefix)) {
            suggestions.push({ sourceField: srcField, targetField: tgtField, confidence: 0.85 });
          }
        }
      }

      // 包含匹配: "订单ID" contains "ID"
      if (srcLower !== tgtLower && (srcLower.includes(tgtLower) || tgtLower.includes(srcLower))) {
        suggestions.push({ sourceField: srcField, targetField: tgtField, confidence: 0.6 });
      }
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

export function LinkedTablesManager({ tables, activeTable, onTablesChange, onActiveTableChange }: LinkedTablesProps) {
  const [relations, setRelations] = useState<TableRelation[]>(() => {
    try {
      return readBusinessData<TableRelation[]>('datainsight-relations') || [];
    } catch {
      return [];
    }
  });
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [newRelation, setNewRelation] = useState<Partial<TableRelation>>({});
  const [viewMode, setViewMode] = useState<'tables' | 'relations' | 'preview'>('tables');

  const saveRelations = useCallback((rels: TableRelation[]) => {
    setRelations(rels);
    storeBusinessData('datainsight-relations', rels);
  }, []);

  const enrichedActiveTable = useMemo(() => {
    if (!activeTable) return null;
    return buildEnrichedTable(activeTable, relations, tables);
  }, [activeTable, relations, tables]);

  const handleAddRelation = () => {
    if (!newRelation.sourceTable || !newRelation.sourceField || !newRelation.targetTable || !newRelation.targetField) return;
    const relation: TableRelation = {
      id: `rel-${Date.now()}`,
      sourceTable: newRelation.sourceTable,
      sourceField: newRelation.sourceField,
      targetTable: newRelation.targetTable,
      targetField: newRelation.targetField,
      displayFields: newRelation.displayFields && newRelation.displayFields.length > 0 ? newRelation.displayFields : [newRelation.targetField],
    };
    saveRelations([...relations, relation]);
    setShowAddRelation(false);
    setNewRelation({});
  };

  const handleDeleteRelation = (id: string) => {
    saveRelations(relations.filter(r => r.id !== id));
  };

  const sourceTable = tables.find(t => t.fileName === newRelation.sourceTable);
  const targetTable = tables.find(t => t.fileName === newRelation.targetTable);
  const canCreateRelation = tables.length >= 2;

  const openAddDialog = () => {
    setNewRelation({
      sourceTable: activeTable?.fileName || tables[0]?.fileName || '',
      sourceField: '',
      targetTable: '',
      targetField: '',
      displayFields: [],
    });
    setShowAddRelation(true);
  };

  return (
    <div className="space-y-4">
      {/* 子导航 + 新建关联入口（始终可见） */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant={viewMode === 'tables' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('tables')}>
            <Database className="w-4 h-4 mr-1" /> 数据表
          </Button>
          <Button variant={viewMode === 'relations' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('relations')}>
            <Link2 className="w-4 h-4 mr-1" /> 关联关系
            {relations.length > 0 && (
              <Badge variant="secondary" className="ml-1">{relations.length}</Badge>
            )}
          </Button>
          <Button variant={viewMode === 'preview' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('preview')} disabled={!activeTable}>
            <Eye className="w-4 h-4 mr-1" /> 关联预览
          </Button>
        </div>
        <Button size="sm" onClick={openAddDialog} title={!canCreateRelation ? '至少需要2张表才能建立关联' : ''}>
          <Plus className="w-4 h-4 mr-1" /> 新建关联
        </Button>
      </div>

      {/* 表数量不足提示 */}
      {!canCreateRelation && (
        <Card className="p-3 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>当前仅 {tables.length} 张数据表，至少需要 2 张表才能建立关联。请上传更多数据文件。</span>
          </div>
        </Card>
      )}

      {viewMode === 'tables' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tables.map(table => (
            <Card
              key={table.fileName}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                activeTable?.fileName === table.fileName ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onActiveTableChange(table)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Table className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{table.fileName}</p>
                    <p className="text-xs text-muted-foreground">{table.rowCount} 行 &middot; {table.columnCount} 列</p>
                  </div>
                </div>
                {activeTable?.fileName === table.fileName && (
                  <Badge variant="default" className="text-[10px]">当前</Badge>
                )}
              </div>
            </Card>
          ))}
          {tables.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>暂无数据表，请先上传数据</p>
            </div>
          )}
        </div>
      )}

      {viewMode === 'relations' && (
        <div className="space-y-3">
          {relations.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>暂无关联关系</p>
              <p className="text-xs mt-1">
                {canCreateRelation ? '点击右上角「新建关联」建立表间关联' : '至少需要2张表才能建立关联'}
              </p>
              {canCreateRelation && (
                <Button variant="outline" size="sm" className="mt-3" onClick={openAddDialog}>
                  <Plus className="w-4 h-4 mr-1" /> 新建关联
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-2">
              {relations.map(rel => (
                <Card key={rel.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <Badge variant="outline">{rel.sourceTable}</Badge>
                      <span className="text-muted-foreground">.{rel.sourceField}</span>
                      <ArrowRightLeft className="w-3 h-3 text-primary" />
                      <Badge variant="outline">{rel.targetTable}</Badge>
                      <span className="text-muted-foreground">.{rel.targetField}</span>
                      <span className="text-xs text-muted-foreground">→ 显示: {rel.displayFields.join(', ')}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteRelation(rel.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'preview' && enrichedActiveTable && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="default">{activeTable?.fileName}</Badge>
            <span className="text-xs text-muted-foreground">已自动填充 {enrichedActiveTable.headers.length - (activeTable?.headers.length || 0)} 个Lookup字段</span>
          </div>
          <DataTable data={enrichedActiveTable} />
        </div>
      )}

      {/* 新建关联弹窗 */}
      <Dialog open={showAddRelation} onOpenChange={setShowAddRelation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建表关联</DialogTitle>
            <DialogDescription>选择两张表之间的关联字段，建立数据关联后可自动拉取Lookup字段。</DialogDescription>
          </DialogHeader>
          {!canCreateRelation ? (
            <div className="py-6 text-center text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <p>至少需要 2 张数据表才能建立关联</p>
              <p className="text-xs mt-1">请先上传更多数据文件</p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-medium">源表</label>
                <Select value={newRelation.sourceTable} onValueChange={v => setNewRelation({ ...newRelation, sourceTable: v, sourceField: '' })}>
                  <SelectTrigger><SelectValue placeholder="选择源表" /></SelectTrigger>
                  <SelectContent>
                    {tables.map(t => <SelectItem key={t.fileName} value={t.fileName}>{t.fileName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {sourceTable && (
                <div>
                  <label className="text-xs font-medium">源表关联字段</label>
                  <Select value={newRelation.sourceField} onValueChange={v => setNewRelation({ ...newRelation, sourceField: v })}>
                    <SelectTrigger><SelectValue placeholder="选择字段" /></SelectTrigger>
                    <SelectContent>
                      {sourceTable.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="text-xs font-medium">目标表</label>
                <Select value={newRelation.targetTable} onValueChange={v => setNewRelation({ ...newRelation, targetTable: v, targetField: '', displayFields: [] })}>
                  <SelectTrigger><SelectValue placeholder="选择目标表" /></SelectTrigger>
                  <SelectContent>
                    {tables.filter(t => t.fileName !== newRelation.sourceTable).map(t => (
                      <SelectItem key={t.fileName} value={t.fileName}>{t.fileName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {targetTable && (
                <>
                  {/* D-14 修复：智能推荐关联字段 */}
                  {sourceTable && newRelation.sourceTable && newRelation.targetTable && !newRelation.sourceField && (
                    <div className="bg-muted/50 rounded-md p-2">
                      <div className="text-xs font-medium text-muted-foreground mb-1.5">智能推荐关联字段</div>
                      {suggestRelationFields(sourceTable, targetTable).length > 0 ? (
                        <div className="space-y-1">
                          {suggestRelationFields(sourceTable, targetTable).map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent flex items-center justify-between"
                              onClick={() => setNewRelation({ ...newRelation, sourceField: s.sourceField, targetField: s.targetField })}
                            >
                              <span>{s.sourceField} → {s.targetField}</span>
                              <span className="text-muted-foreground">{Math.round(s.confidence * 100)}%</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">未发现相似字段，请手动选择</div>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium">目标表关联字段</label>
                    <Select value={newRelation.targetField} onValueChange={v => setNewRelation({ ...newRelation, targetField: v })}>
                      <SelectTrigger><SelectValue placeholder="选择字段" /></SelectTrigger>
                      <SelectContent>
                        {targetTable.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">显示字段（可多选，从目标表拉取到源表）</label>
                    <ScrollArea className="h-24 border rounded-md p-2">
                      <div className="space-y-1">
                        {targetTable.headers.map(h => (
                          <label key={h} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-1">
                            <input
                              type="checkbox"
                              checked={(newRelation.displayFields || []).includes(h)}
                              onChange={e => {
                                const current = newRelation.displayFields || [];
                                setNewRelation({
                                  ...newRelation,
                                  displayFields: e.target.checked ? [...current, h] : current.filter(x => x !== h),
                                });
                              }}
                            />
                            <span className="text-xs">{h}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddRelation(false)}>取消</Button>
            {canCreateRelation && (
              <Button size="sm" onClick={handleAddRelation} disabled={!newRelation.sourceField || !newRelation.targetField}>
                创建关联
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
