'use client';

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/use-auth';
import { LogIn, LogOut, Settings, Users, Shield, Brain } from 'lucide-react';

interface UserMenuProps {
  onOpenSettings?: () => void;
  onOpenAdmin?: () => void;
}

export function UserMenu({ onOpenSettings, onOpenAdmin }: UserMenuProps) {
  const { user, isLoggedIn, isAdmin, logout, setLoginDialogOpen } = useAuth();

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

  return (
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
          <>
            <DropdownMenuItem onClick={onOpenAdmin} className="cursor-pointer">
              <Users className="w-4 h-4 mr-2" />
              权限管理
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                // 打开AI模型配置（管理员专用）
                if (onOpenAdmin) onOpenAdmin();
              }}
              className="cursor-pointer"
            >
              <Brain className="w-4 h-4 mr-2" />
              AI模型配置
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
