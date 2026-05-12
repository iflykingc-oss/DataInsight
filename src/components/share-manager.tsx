'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Mail,
  Copy,
  Check,
  Eye,
  Edit3,
  Trash2,
  Clock,
  Users,
  Globe,
  Lock,
  Download,
  Printer,
  RefreshCw,
  Plus,
  X,
  Shield,
  Key,
  Code
} from 'lucide-react';
import { generateId } from '@/lib/utils';

interface ShareConfig {
  link: string;
  isPublic: boolean;
  expiresAt?: string;
  password?: string;
  permissions: 'view' | 'edit' | 'admin';
  viewCount: number;
  lastViewed?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  avatar?: string;
}

interface ShareManagerProps {
  dashboardName?: string;
}

export function ShareManager({ dashboardName = '数据仪表盘' }: ShareManagerProps) {
  const [shareConfig, setShareConfig] = useState<ShareConfig>({
    link: '',
    isPublic: false,
    expiresAt: undefined,
    permissions: 'view',
    viewCount: 0
  });
  
  // Generate link using useCallback to avoid impure function in render
  const generateNewLink = useCallback(() => {
    const newLink = `https://datainsight.app/share/${generateId('share')}`;
    setShareConfig(prev => ({ ...prev, link: newLink }));
  }, []);
  
  const [copied, setCopied] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: '1', name: '当前用户', email: 'you@example.com', role: 'owner' },
    { id: '2', name: '张三', email: 'zhangsan@example.com', role: 'editor' },
    { id: '3', name: '李四', email: 'lisi@example.com', role: 'viewer' }
  ]);
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  
  const [embedCode, setEmbedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const copyLink = () => {
    if (!shareConfig.link) {
      generateNewLink();
    }
    navigator.clipboard.writeText(shareConfig.link || `https://datainsight.app/share/${generateId('share')}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const generateEmbedCode = (type: 'iframe' | 'link' | 'button') => {
    setIsGenerating(true);
    setTimeout(() => {
      switch (type) {
        case 'iframe':
          setEmbedCode(`<iframe src="${shareConfig.link}" width="100%" height="600" frameborder="0"></iframe>`);
          break;
        case 'link':
          setEmbedCode(`<a href="${shareConfig.link}" target="_blank">查看 ${dashboardName}</a>`);
          break;
        case 'button':
          setEmbedCode(`<button onclick="window.open('${shareConfig.link}')">查看 ${dashboardName}</button>`);
          break;
      }
      setIsGenerating(false);
    }, 500);
  };
  
  const inviteMember = () => {
    if (!inviteEmail) return;
    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole
    };
    setTeamMembers([...teamMembers, newMember]);
    setInviteEmail('');
  };
  
  const removeMember = (id: string) => {
    setTeamMembers(teamMembers.filter(m => m.id !== id));
  };
  
  const updateMemberRole = (id: string, role: TeamMember['role']) => {
    setTeamMembers(teamMembers.map(m => m.id === id ? { ...m, role } : m));
  };
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge className="bg-purple-100 text-purple-700">所有者</Badge>;
      case 'editor':
        return <Badge className="bg-blue-100 text-blue-700">可编辑</Badge>;
      case 'viewer':
        return <Badge variant="secondary">仅查看</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Share2 className="w-5 h-5 text-blue-500" />
          分享与协作
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="share" className="space-y-4">
          <TabsList>
            <TabsTrigger value="share">
              <Link2 className="w-4 h-4 mr-1" />
              分享链接
            </TabsTrigger>
            <TabsTrigger value="team">
              <Users className="w-4 h-4 mr-1" />
              团队协作
            </TabsTrigger>
            <TabsTrigger value="embed">
              <Code className="w-4 h-4 mr-1" />
              嵌入代码
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <Shield className="w-4 h-4 mr-1" />
              权限设置
            </TabsTrigger>
          </TabsList>
          
          {/* 分享链接 */}
          <TabsContent value="share" className="space-y-4">
            {/* 链接配置 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-md">
                <div className="flex-1">
                  <p className="text-sm font-medium">分享链接</p>
                  <p className="text-xs text-muted-foreground truncate">{shareConfig.link}</p>
                </div>
                <Button variant="outline" size="sm" onClick={copyLink}>
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      复制
                    </>
                  )}
                </Button>
              </div>
              
              {/* 访问控制 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-3">
                    {shareConfig.isPublic ? (
                      <Globe className="w-5 h-5 text-green-500" />
                    ) : (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium">公开访问</p>
                      <p className="text-xs text-muted-foreground">
                        {shareConfig.isPublic ? '任何人可访问' : '仅限受邀人员'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={shareConfig.isPublic ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShareConfig({ ...shareConfig, isPublic: !shareConfig.isPublic })}
                  >
                    {shareConfig.isPublic ? '已开启' : '开启'}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">访问密码</p>
                      <p className="text-xs text-muted-foreground">
                        {shareConfig.password ? '已设置密码保护' : '未设置密码'}
                      </p>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        {shareConfig.password ? '修改密码' : '设置密码'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>设置访问密码</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>访问密码</Label>
                          <Input
                            type="password"
                            placeholder="输入密码"
                            value={shareConfig.password || ''}
                            onChange={e => setShareConfig({ ...shareConfig, password: e.target.value })}
                          />
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setShareConfig({ ...shareConfig, password: undefined })}
                        >
                          移除密码保护
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">链接过期</p>
                      <p className="text-xs text-muted-foreground">
                        {shareConfig.expiresAt
                          ? `过期时间: ${new Date(shareConfig.expiresAt).toLocaleString()}`
                          : '永不过期'}
                      </p>
                    </div>
                  </div>
                  <Select
                    value={shareConfig.expiresAt || 'never'}
                    onValueChange={v => setShareConfig({
                      ...shareConfig,
                      expiresAt: v === 'never' ? undefined : new Date(Date.now() + Number(v) * 24 * 60 * 60 * 1000).toISOString()
                    })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">永不过期</SelectItem>
                      <SelectItem value="1">1天后</SelectItem>
                      <SelectItem value="7">7天后</SelectItem>
                      <SelectItem value="30">30天后</SelectItem>
                      <SelectItem value="90">90天后</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* 统计数据 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-md text-center">
                  <p className="text-2xl font-bold text-blue-600">{shareConfig.viewCount}</p>
                  <p className="text-xs text-muted-foreground">浏览次数</p>
                </div>
                <div className="p-4 bg-green-50 rounded-md text-center">
                  <p className="text-2xl font-bold text-green-600">12</p>
                  <p className="text-xs text-muted-foreground">独立访客</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-md text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {shareConfig.lastViewed ? '2分钟前' : '暂无'}
                  </p>
                  <p className="text-xs text-muted-foreground">最后访问</p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* 团队协作 */}
          <TabsContent value="team" className="space-y-4">
            {/* 邀请成员 */}
            <div className="p-4 border rounded-md">
              <h4 className="font-medium mb-3">邀请团队成员</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="输入邮箱地址"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <Select value={inviteRole} onValueChange={v => setInviteRole(v as 'editor' | 'viewer')}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">可编辑</SelectItem>
                    <SelectItem value="viewer">仅查看</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={inviteMember} disabled={!inviteEmail}>
                  <Plus className="w-4 h-4 mr-1" />
                  邀请
                </Button>
              </div>
            </div>
            
            {/* 成员列表 */}
            <div className="space-y-2">
              <h4 className="font-medium">团队成员 ({teamMembers.length})</h4>
              {teamMembers.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{member.name}</p>
                        {getRoleBadge(member.role)}
                      </div>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  {member.role !== 'owner' && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={v => updateMemberRole(member.id, v as 'owner' | 'editor' | 'viewer')}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">可编辑</SelectItem>
                          <SelectItem value="viewer">仅查看</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMember(member.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
          
          {/* 嵌入代码 */}
          <TabsContent value="embed" className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Button
                variant={embedCode.includes('iframe') ? 'default' : 'outline'}
                onClick={() => generateEmbedCode('iframe')}
                disabled={isGenerating}
              >
                嵌入 iframe
              </Button>
              <Button
                variant={embedCode.includes('<a href') ? 'default' : 'outline'}
                onClick={() => generateEmbedCode('link')}
                disabled={isGenerating}
              >
                嵌入链接
              </Button>
              <Button
                variant={embedCode.includes('<button') ? 'default' : 'outline'}
                onClick={() => generateEmbedCode('button')}
                disabled={isGenerating}
              >
                嵌入按钮
              </Button>
            </div>
            
            {embedCode && (
              <div className="p-4 bg-gray-900 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">嵌入代码</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigator.clipboard.writeText(embedCode)}
                    className="text-muted-foreground hover:text-white"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    复制
                  </Button>
                </div>
                <pre className="text-xs text-green-400 overflow-x-auto">
                  {embedCode}
                </pre>
              </div>
            )}
            
            <div className="p-4 bg-blue-50 rounded-md">
              <h4 className="font-medium text-blue-800 mb-2">嵌入说明</h4>
              <ul className="text-sm text-blue-600 space-y-1">
                <li>• iframe 嵌入：可嵌入到网站中，支持自定义尺寸</li>
                <li>• 链接嵌入：生成可点击的链接文字</li>
                <li>• 按钮嵌入：生成可点击的按钮样式</li>
              </ul>
            </div>
          </TabsContent>
          
          {/* 权限设置 */}
          <TabsContent value="permissions" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 border rounded-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">查看权限</p>
                      <p className="text-xs text-muted-foreground">允许查看数据和图表</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">已开启</Badge>
                </div>
              </div>
              
              <div className="p-4 border rounded-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Edit3 className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">编辑权限</p>
                      <p className="text-xs text-muted-foreground">允许修改图表和仪表盘</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">已开启</Badge>
                </div>
              </div>
              
              <div className="p-4 border rounded-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">导出权限</p>
                      <p className="text-xs text-muted-foreground">允许导出数据和报表</p>
                    </div>
                  </div>
                  <Badge variant="outline">未开启</Badge>
                </div>
              </div>
              
              <div className="p-4 border rounded-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">删除权限</p>
                      <p className="text-xs text-muted-foreground">允许删除仪表盘</p>
                    </div>
                  </div>
                  <Badge variant="outline">仅所有者</Badge>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
