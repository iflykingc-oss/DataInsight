'use client';

import { useState } from 'react';
import { MessageSquare, Send, Paperclip, Smile, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface Comment {
  id: string;
  rowId: string | number;
  author: string;
  content: string;
  timestamp: string;
}

interface RowCommentsProps {
  rows: Record<string, unknown>[];
  rowKeyField?: string;
}

export function RowComments({ rows, rowKeyField }: RowCommentsProps) {
  const [comments, setComments] = useState<Comment[]>(() => {
    try { return JSON.parse(localStorage.getItem('datainsight-comments') || '[]'); }
    catch { return []; }
  });
  const [activeRow, setActiveRow] = useState<number>(0);
  const [newComment, setNewComment] = useState('');

  const saveComments = (c: Comment[]) => {
    setComments(c);
    localStorage.setItem('datainsight-comments', JSON.stringify(c));
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    const rowId = rowKeyField && rows[activeRow] ? String(rows[activeRow][rowKeyField] ?? activeRow) : activeRow;
    const comment: Comment = {
      id: `c-${Date.now()}`,
      rowId,
      author: '当前用户',
      content: newComment,
      timestamp: new Date().toLocaleString(),
    };
    saveComments([...comments, comment]);
    setNewComment('');
  };

  const deleteComment = (id: string) => {
    saveComments(comments.filter(c => c.id !== id));
  };

  const rowComments = comments.filter(c => {
    const rowId = rowKeyField && rows[activeRow] ? String(rows[activeRow][rowKeyField] ?? activeRow) : activeRow;
    return String(c.rowId) === String(rowId);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium">行内评论</h3>
        <Badge variant="secondary">{comments.length} 条</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 行选择 */}
        <Card className="p-2 max-h-96 overflow-auto">
          <p className="text-xs font-medium px-2 py-1">选择行</p>
          <div className="space-y-1">
            {rows.slice(0, 50).map((row, idx) => (
              <button
                key={idx}
                onClick={() => setActiveRow(idx)}
                className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                  activeRow === idx ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                第 {idx + 1} 行 {rowKeyField && row[rowKeyField] ? `· ${String(row[rowKeyField]).slice(0, 20)}` : ''}
              </button>
            ))}
          </div>
        </Card>

        {/* 评论区域 */}
        <Card className="p-3 md:col-span-2 space-y-3">
          <p className="text-xs text-muted-foreground">第 {activeRow + 1} 行 · {rowComments.length} 条评论</p>

          <div className="space-y-2 max-h-64 overflow-auto">
            {rowComments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">暂无评论</p>
            ) : (
              rowComments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <Avatar className="w-6 h-6"><AvatarFallback className="text-[10px]">{c.author.slice(0, 1)}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{c.author}</span>
                      <span className="text-[10px] text-muted-foreground">{c.timestamp}</span>
                    </div>
                    <p className="text-xs mt-0.5">{c.content}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => deleteComment(c.id)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="输入评论..."
              rows={2}
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7"><Paperclip className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7"><Smile className="w-3.5 h-3.5" /></Button>
              </div>
              <Button size="sm" onClick={addComment} disabled={!newComment.trim()}>
                <Send className="w-3.5 h-3.5 mr-1" /> 发送
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
