'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useI18n, LOCALE_OPTIONS, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * LanguageSwitcher — 中英文切换组件
 * 用在顶部栏右侧，下拉选择语言
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const current = LOCALE_OPTIONS.find(o => o.value === locale) || LOCALE_OPTIONS[0];

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 h-7 px-2 rounded-sm text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        title="Switch Language / 切换语言"
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{locale === 'zh-CN' ? '中' : 'EN'}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[140px] bg-popover border border-border rounded-md shadow-float z-50 py-1">
          {LOCALE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setLocale(opt.value as Locale);
                setOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors',
                locale === opt.value
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <span className="text-base">{opt.flag}</span>
              <span>{opt.label}</span>
              {locale === opt.value && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
