"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FormRenderer, FormConfig } from "@/components/form-builder";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Database, ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

function FormPageContent() {
  const searchParams = useSearchParams();
  const formId = searchParams.get("id");
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!formId) { setLoading(false); return; }
    try {
      const all = JSON.parse(localStorage.getItem("datainsight-forms") || "[]") as FormConfig[];
      const found = all.find((f) => f.id === formId);
      if (found) {
        setConfig(found);
        // Check deadline
        if (found.settings.deadline) {
          const deadline = new Date(found.settings.deadline).getTime();
          if (Date.now() > deadline) {
            setExpired(true);
          }
        }
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [formId]);

  const handleSubmit = (data: Record<string, string>) => {
    if (!config) return;
    try {
      const existing = JSON.parse(
        localStorage.getItem("datainsight-form-submissions") || "[]"
      );
      // Check submit limit
      if (config.settings.submitLimit) {
        const mySubmissions = existing.filter(
          (s: { formId: string; submittedAt: number }) => s.formId === config.id
        );
        if (mySubmissions.length >= config.settings.submitLimit) {
          toast.error(`每人最多提交 ${config.settings.submitLimit} 次`);
          return;
        }
      }
      existing.push({
        id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4),
        formId: config.id,
        data,
        submittedAt: Date.now(),
      });
      localStorage.setItem(
        "datainsight-form-submissions",
        JSON.stringify(existing)
      );
      toast.success("提交成功！");
      setSubmitted(true);
    } catch {
      toast.error("提交失败，请重试");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: config?.theme.bgColor || "#F9FAFB" }}>
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!formId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center space-y-4">
            <Database className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-semibold">无效的表单链接</h2>
            <p className="text-sm text-muted-foreground">
              请检查链接是否完整，或联系表单创建者
            </p>
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <ArrowLeft className="w-4 h-4" /> 返回工作台
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center space-y-4">
            <Database className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-semibold">表单未找到</h2>
            <p className="text-sm text-muted-foreground">
              该表单可能已被删除或链接已过期
            </p>
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <ArrowLeft className="w-4 h-4" /> 返回工作台
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: config.theme.bgColor }}>
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center space-y-4">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-semibold">表单已过期</h2>
            <p className="text-sm text-muted-foreground">
              该表单的收集截止时间已到，不再接受新的提交
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: config.theme.bgColor }}>
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h2 className="text-lg font-semibold">提交成功</h2>
            <p className="text-sm text-muted-foreground">
              {config.settings.successMessage || "您的数据已成功提交，感谢您的参与"}
            </p>
            {config.settings.allowModify && (
              <button
                className="text-sm text-primary hover:underline"
                onClick={() => setSubmitted(false)}
              >
                修改我的提交
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: config.theme.bgColor }}>
      <FormRenderer config={config} onSubmit={handleSubmit} />
      <p className="text-center text-xs text-muted-foreground mt-4">
        Powered by DataInsight
      </p>
    </div>
  );
}

export default function FormPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <FormPageContent />
    </Suspense>
  );
}
