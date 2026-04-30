"use client";

import React, { useState, useMemo, useCallback, Dispatch, SetStateAction } from "react";
import { ParsedData } from "@/lib/data-processor/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Copy,
  Eye,
  Plus,
  Trash2,
  GripVertical,
  ExternalLink,
} from "lucide-react";

export interface FormFieldConfig {
  id: string;
  sourceField: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "multiselect" | "textarea";
  required: boolean;
  options?: string[];
  visible: boolean;
}

export interface FormConfig {
  id: string;
  title: string;
  description: string;
  fields: FormFieldConfig[];
  createdAt: number;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "文本",
  number: "数字",
  date: "日期",
  select: "下拉选择",
  multiselect: "多选",
  textarea: "多行文本",
};

function generateFormId(): string {
  return "form-" + Math.random().toString(36).substring(2, 10);
}

export function FormBuilder({
  data,
  onDataChange,
}: {
  data: ParsedData | null;
  onDataChange: Dispatch<SetStateAction<ParsedData | null>>;
}) {
  const headers = data?.headers ?? [];
  const rows = data?.rows ?? [];
  const parsedData = data; // pass to form preview
  const [configs, setConfigs] = useState<FormConfig[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("datainsight-forms") || "[]");
    } catch {
      return [];
    }
  });
  const [editing, setEditing] = useState<FormConfig | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const saveConfigs = useCallback(
    (next: FormConfig[]) => {
      setConfigs(next);
      localStorage.setItem("datainsight-forms", JSON.stringify(next));
    },
    []
  );

  const startNew = useCallback(() => {
    if (!parsedData) {
      toast.error("请先上传数据表");
      return;
    }
    const newConfig: FormConfig = {
      id: generateFormId(),
      title: `${parsedData.fileName} - 数据收集`,
      description: "请填写以下信息",
      fields: parsedData.headers.map((h) => ({
        id: Math.random().toString(36).substring(2, 10),
        sourceField: h,
        label: h,
        type: "text" as const,
        required: false,
        visible: true,
        options: inferOptions(parsedData.rows, h),
      })),
      createdAt: Date.now(),
    };
    setEditing(newConfig);
  }, [parsedData]);

  const addField = useCallback(() => {
    if (!editing) return;
    const newField: FormFieldConfig = {
      id: Math.random().toString(36).substring(2, 10),
      sourceField: headers[0] || "字段",
      label: "新字段",
      type: "text",
      required: false,
      visible: true,
    };
    setEditing({ ...editing, fields: [...editing.fields, newField] });
  }, [editing, headers]);

  const updateField = useCallback(
    (index: number, patch: Partial<FormFieldConfig>) => {
      if (!editing) return;
      const next = { ...editing };
      next.fields = next.fields.map((f, i) =>
        i === index ? { ...f, ...patch } : f
      );
      // 更新sourceField时自动推断options
      if (patch.sourceField) {
        next.fields[index].options = inferOptions(rows, patch.sourceField);
      }
      setEditing(next);
    },
    [editing, rows]
  );

  const removeField = useCallback(
    (index: number) => {
      if (!editing) return;
      setEditing({
        ...editing,
        fields: editing.fields.filter((_, i) => i !== index),
      });
    },
    [editing]
  );

  const saveEditing = useCallback(() => {
    if (!editing) return;
    const next = configs.filter((c) => c.id !== editing.id);
    next.unshift(editing);
    saveConfigs(next);
    setEditing(null);
    toast.success("表单已保存");
  }, [editing, configs, saveConfigs]);

  const deleteConfig = useCallback(
    (id: string) => {
      saveConfigs(configs.filter((c) => c.id !== id));
      toast.success("表单已删除");
    },
    [configs, saveConfigs]
  );

  const getShareUrl = useCallback((id: string) => {
    const domain =
      typeof window !== "undefined" ? window.location.origin : "";
    return `${domain}/form?id=${id}`;
  }, []);

  const copyUrl = useCallback(
    (id: string) => {
      navigator.clipboard.writeText(getShareUrl(id));
      toast.success("分享链接已复制");
    },
    [getShareUrl]
  );

  if (previewMode && editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">表单预览</h3>
          <Button variant="outline" onClick={() => setPreviewMode(false)}>
            返回编辑
          </Button>
        </div>
        <FormRenderer config={editing} readOnly />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">编辑表单</h3>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewMode(true)}>
              <Eye className="w-4 h-4 mr-1" />
              预览
            </Button>
            <Button variant="outline" onClick={() => setEditing(null)}>
              取消
            </Button>
            <Button onClick={saveEditing}>保存表单</Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label>表单标题</Label>
              <Input
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
              />
            </div>
            <div>
              <Label>表单描述</Label>
              <Input
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h4 className="font-medium">字段配置 ({editing.fields.length})</h4>
          <Button variant="outline" size="sm" onClick={addField}>
            <Plus className="w-4 h-4 mr-1" />
            添加字段
          </Button>
        </div>

        {editing.fields.map((field, index) => (
          <Card key={field.id}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground mt-2" />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">关联字段</Label>
                    <Select
                      value={field.sourceField}
                      onValueChange={(v) =>
                        updateField(index, { sourceField: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">显示名称</Label>
                    <Input
                      value={field.label}
                      onChange={(e) =>
                        updateField(index, { label: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">字段类型</Label>
                    <Select
                      value={field.type}
                      onValueChange={(v) =>
                        updateField(index, {
                          type: v as FormFieldConfig["type"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FIELD_TYPE_LABELS).map(
                          ([k, label]) => (
                            <SelectItem key={k} value={k}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={field.required}
                        onCheckedChange={(c) =>
                          updateField(index, { required: c as boolean })
                        }
                      />
                      必填
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeField(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
              {field.options && field.options.length > 0 && (
                <div className="text-xs text-muted-foreground pl-7">
                  已推断选项: {field.options.slice(0, 8).join(", ")}
                  {field.options.length > 8 && " ..."}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">表单收集</h3>
        <Button onClick={startNew} disabled={!parsedData}>
          <Plus className="w-4 h-4 mr-1" />
          新建表单
        </Button>
      </div>

      {!parsedData && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            请先上传数据表，才能创建数据收集表单
          </CardContent>
        </Card>
      )}

      {configs.length === 0 && parsedData && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            暂无表单，点击上方按钮创建
          </CardContent>
        </Card>
      )}

      {configs.map((config) => (
        <Card key={config.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{config.title}</CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(config)}
                >
                  编辑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyUrl(config.id)}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  复制链接
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteConfig(config.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {config.description}
            </p>
            <div className="flex flex-wrap gap-1">
              {config.fields
                .filter((f) => f.visible)
                .map((f) => (
                  <Badge key={f.id} variant="secondary" className="text-xs">
                    {f.label}
                    {f.required && "*"}
                  </Badge>
                ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="w-3 h-3" />
              <span className="truncate">{getShareUrl(config.id)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** 表单渲染器（填写/预览） */
export function FormRenderer({
  config,
  readOnly,
  onSubmit,
}: {
  config: FormConfig;
  readOnly?: boolean;
  onSubmit?: (data: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = useCallback(() => {
    const nextErrors: Record<string, string> = {};
    config.fields.forEach((f) => {
      if (f.required && !values[f.id]) {
        nextErrors[f.id] = "此项为必填";
      }
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onSubmit?.(values);
    }
  }, [config, values, onSubmit]);

  const visibleFields = config.fields.filter((f) => f.visible);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {config.description}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleFields.map((field) => (
          <div key={field.id}>
            <Label>
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            {field.type === "textarea" ? (
              <textarea
                className="w-full mt-1 min-h-[80px] rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={values[field.id] || ""}
                onChange={(e) =>
                  setValues({ ...values, [field.id]: e.target.value })
                }
                disabled={readOnly}
              />
            ) : field.type === "select" && field.options ? (
              <Select
                value={values[field.id] || ""}
                onValueChange={(v) =>
                  setValues({ ...values, [field.id]: v })
                }
                disabled={readOnly}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.type === "multiselect" && field.options ? (
              <div className="mt-1 flex flex-wrap gap-2">
                {field.options.map((o) => {
                  const selected = (values[field.id] || "")
                    .split(",")
                    .includes(o);
                  return (
                    <label
                      key={o}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border cursor-pointer transition ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={selected}
                        onChange={() => {
                          const current = (values[field.id] || "")
                            .split(",")
                            .filter(Boolean);
                          const next = current.includes(o)
                            ? current.filter((v) => v !== o)
                            : [...current, o];
                          setValues({
                            ...values,
                            [field.id]: next.join(","),
                          });
                        }}
                        disabled={readOnly}
                      />
                      {o}
                    </label>
                  );
                })}
              </div>
            ) : (
              <Input
                className="mt-1"
                type={
                  field.type === "number"
                    ? "number"
                    : field.type === "date"
                    ? "date"
                    : "text"
                }
                value={values[field.id] || ""}
                onChange={(e) =>
                  setValues({ ...values, [field.id]: e.target.value })
                }
                disabled={readOnly}
              />
            )}
            {errors[field.id] && (
              <p className="text-xs text-red-500 mt-1">{errors[field.id]}</p>
            )}
          </div>
        ))}
        {!readOnly && (
          <Button className="w-full" onClick={handleSubmit}>
            提交
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function inferOptions(
  rows: Record<string, import("@/types").CellValue>[],
  field: string
): string[] | undefined {
  if (!rows || rows.length === 0) return undefined;
  const values = rows
    .map((r) => String(r[field] ?? ""))
    .filter((v) => v && v !== "undefined" && v !== "null");
  const unique = [...new Set(values)];
  if (unique.length <= 1 || unique.length > 20) return undefined;
  return unique.sort();
}
