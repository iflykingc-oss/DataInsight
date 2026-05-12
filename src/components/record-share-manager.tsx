'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Share2,
  Link2,
  Copy,
  Check,
  Globe,
  Lock,
  Mail,
  Users,
  Clock,
  Eye,
  FileText,
  QrCode
} from 'lucide-react';
import { generateId } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface RecordShareConfig {
  link: string;
  isPublic: boolean;
  expiresAt?: string;
  password?: string;
  permissions: 'view' | 'edit';
  includeFields: string[]; // 要包含的字段
}

interface RecordShareManagerProps {
  recordData: Record<string, unknown>;
  headers: string[];
  recordIndex: number;
  trigger?: React.ReactNode;
}

export function RecordShareManager({ 
  recordData, 
  headers, 
  recordIndex,
  trigger 
}: RecordShareManagerProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareConfig, setShareConfig] = useState<RecordShareConfig>({
    link: '',
    isPublic: false,
    permissions: 'view',
    includeFields: headers
  });
  const [inviteEmail, setInviteEmail] = useState('');
  
  const generateShareLink = useCallback(() => {
    const recordId = generateId('record');
    const shareId = generateId('share');
    // 生成包含记录ID和分享ID的链接
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${baseUrl}/share/record/${recordId}?sid=${shareId}`;
    setShareConfig(prev => ({ ...prev, link }));
    return link;
  }, []);

  const copyLink = useCallback(() => {
    if (!shareConfig.link) {
      generateShareLink();
    }
    navigator.clipboard.writeText(shareConfig.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareConfig.link, generateShareLink]);

  const sendEmailInvite = useCallback(() => {
    if (!inviteEmail) return;
    const subject = encodeURIComponent(`邀请您查看记录 #${recordIndex + 1}`);
    const body = encodeURIComponent(`您好，\n\n我邀请您查看以下记录：\n\n${
      headers.map(h => `${h}: ${recordData[h] ?? ''}`).join('\n')
    }\n\n点击链接查看：${shareConfig.link || '(点击复制链接)'}`);
    window.open(`mailto:${inviteEmail}?subject=${subject}&body=${body}`);
  }, [inviteEmail, recordData, headers, recordIndex, shareConfig.link]);

  const { t } = useI18n();

  const getSharePreview = useCallback(() => {
    const previewFields = shareConfig.includeFields.slice(0, 5);
    return previewFields.map(field => ({
      field,
      value: recordData[field]
    }));
  }, [shareConfig.includeFields, recordData]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            分享记录
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            分享记录 #{recordIndex + 1}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 分享预览 */}
          <div className="p-4 bg-muted/50 rounded-md">
            <p className="text-sm font-medium mb-2">{t('txt.分享预览')}</p>
            <div className="space-y-2">
              {getSharePreview().map(({ field, value }) => (
                <div key={field} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">{field}:</span>
                  <span className="truncate">
                    {value !== null && value !== undefined ? String(value) : '-'}
                  </span>
                </div>
              ))}
              {shareConfig.includeFields.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  还有 {shareConfig.includeFields.length - 5} 个字段...
                </p>
              )}
            </div>
          </div>

          {/* 分享链接 */}
          <div className="space-y-3">
            <Label>{t('txt.分享链接')}</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={shareConfig.link}
                  onChange={(e) => setShareConfig(prev => ({ ...prev, link: e.target.value }))}
                  placeholder={t("ph.点击生成链接")}
                  className="pl-9"
                  readOnly
                />
              </div>
              <Button onClick={copyLink} variant="outline">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button onClick={generateShareLink} variant="outline">
                生成
              </Button>
            </div>
          </div>

          {/* 分享设置 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-3">
                {shareConfig.isPublic ? (
                  <Globe className="w-5 h-5 text-green-500" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">{t('txt.公开访问')}</p>
                  <p className="text-xs text-muted-foreground">
                    {shareConfig.isPublic ? '任何人可查看' : '仅受邀人员可查看'}
                  </p>
                </div>
              </div>
              <Button
                variant={shareConfig.isPublic ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShareConfig(prev => ({ ...prev, isPublic: !prev.isPublic }))}
              >
                {shareConfig.isPublic ? '已开启' : '开启'}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>{t('txt.访问权限')}</Label>
              <Select
                value={shareConfig.permissions}
                onValueChange={(v: 'view' | 'edit') => setShareConfig(prev => ({ ...prev, permissions: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      <span>{t('txt.仅查看')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{t('txt.可编辑')}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('txt.链接有效期')}</Label>
              <Select
                value={shareConfig.expiresAt || 'never'}
                onValueChange={(v) => setShareConfig(prev => ({ 
                  ...prev, 
                  expiresAt: v === 'never' ? undefined : v 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">{t('txt.永不过期')}</SelectItem>
                  <SelectItem value="1h">1小时后</SelectItem>
                  <SelectItem value="24h">24小时后</SelectItem>
                  <SelectItem value="7d">7天后</SelectItem>
                  <SelectItem value="30d">30天后</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 邮件邀请 */}
          <div className="space-y-3 pt-4 border-t">
            <Label>{t('txt.邀请其他人查看')}</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t("ph.输入邮箱地址")}
                  className="pl-9"
                />
              </div>
              <Button onClick={sendEmailInvite} variant="outline">
                <Mail className="w-4 h-4 mr-2" />
                发送邀请
              </Button>
            </div>
          </div>

          {/* 二维码 */}
          {shareConfig.link && (
            <div className="flex flex-col items-center gap-3 pt-4 border-t">
              <div className="p-4 bg-white rounded-md">
                <QrCode className="w-32 h-32 text-muted-foreground" />
                <p className="text-xs text-center text-muted-foreground mt-2">
                  扫码查看记录
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
