"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FormRenderer, FormConfig } from "@/components/form-builder";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Database, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function FormPage() {
  const searchParams = useSearchParams();
  const formId = searchParams.get("id");
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!formId) return;
    try {
      const all = JSON.parse(
        localStorage.getItem("datainsight-forms") || "[]"
      ) as FormConfig[];
      const found = all.find((f) => f.id === formId);
      if (found) setConfig(found);
    } catch {
      // ignore
    }
  }, [formId]);

  const handleSubmit = (data: Record<string, string>) => {
    if (!config) return;
    // 将表单数据追加到parsedData
    try {
      const existing = JSON.parse(
        localStorage.getItem("datainsight-form-submissions") || "[]"
      );
      existing.push({
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
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              返回工作台
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
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <span className="text-green-600 text-xl">✓</span>
            </div>
            <h2 className="text-lg font-semibold">提交成功</h2>
            <p className="text-sm text-muted-foreground">
              您的数据已成功提交，感谢您的参与
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <FormRenderer config={config} onSubmit={handleSubmit} />
    </div>
  );
}
