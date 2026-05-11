'use client';

import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/use-auth';
import { LogIn, LogOut, Settings, Users, Shield, Trash2, AlertTriangle, Loader2, Download } from 'lucide-react';
import Link from 'next/link';

interface UserMenuProps {
  onOpenSettings?: () => void;
}

export function UserMenu({ onOpenSettings }: UserMenuProps) {
  const { user, isLoggedIn, isAdmin, logout, setLoginDialogOpen } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/auth/export-data', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `datainsight-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      console.error('导出数据失败');
    }
  };
  if (!isLoggedIn) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLoginDialogOpen(true)}
        className="gap-1.5"
      >
        <LogIn className="w-4 h-4" />
        <span className="hidden sm:inline">登录</span>
      </Button>
    );
  }

  const initials = user?.name?.slice(0, 2) || user?.username?.slice(0, 2) || 'U';

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('请输入密码确认');
      return;
    }
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (data.success) {
        setDeleteDialogOpen(false);
        logout();
      } else {
        setDeleteError(data.error || '注销失败');
      }
    } catch {
      setDeleteError('网络错误，请稍后重试');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline max-w-[100px] truncate">
              {user?.name}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.username}</p>
              {isAdmin && (
                <div className="flex items-center gap-1 text-xs text-primary mt-1">
                  <Shield className="w-3 h-3" />
                  <span>管理员</span>
                </div>
              )}
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onOpenSettings} className="cursor-pointer">
            <Settings className="w-4 h-4 mr-2" />
            AI模型设置
          </DropdownMenuItem>

          {isAdmin && (
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/?view=admin">
                <Users className="w-4 h-4 mr-2" />
                权限管理
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleExportData} className="cursor-pointer">
            <Download className="w-4 h-4 mr-2" />
            导出我的数据
          </DropdownMenuItem>

          {!isAdmin && (
            <DropdownMenuItem
              onClick={() => { setDeleteDialogOpen(true); setDeletePassword(''); setDeleteError(''); }}
              className="cursor-pointer text-muted-foreground focus:text-muted-foreground"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              注销账号
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 注销账号确认弹窗 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              注销账号
            </DialogTitle>
            <DialogDescription>
              此操作不可恢复，您的所有数据将被永久删除。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive space-y-1">
              <p className="font-medium">注销后将失去：</p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                <li>账号信息和登录权限</li>
                <li>AI 模型配置</li>
                <li>所有操作记录</li>
                <li>仪表盘配置和自定义指标</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">请输入密码确认注销</label>
              <Input
                type="password"
                placeholder="输入当前密码"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteLoading || !deletePassword}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  注销中...
                </>
              ) : (
                '确认注销'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
