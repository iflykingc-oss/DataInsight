"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef, Dispatch, SetStateAction } from "react";
import { useI18n } from '@/lib/i18n';
import { useAuth } from "@/lib/use-auth";
import { ParsedData } from "@/lib/data-processor/types";
import { safeSetItem } from "@/lib/safe-storage";
import { storeBusinessData, readBusinessData } from "@/lib/data-lifecycle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Copy,
  Eye,
  Plus,
  Trash2,
  GripVertical,
  ExternalLink,
  QrCode,
  Download,
  Table2,
  Settings2,
  Palette,
  BarChart3,
  Image as ImageIcon,
  FileUp,
  Star,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Clock,
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  Filter,
  FileSpreadsheet,
  ToggleLeft,
  ListChecks,
  AlignLeft,
  Calendar,
  Hash,
  ChevronDown,
  CheckSquare,
  CircleDot,
} from "lucide-react";
import QRCode from "qrcode";
import ExcelJS from "exceljs";

/* ─── Types ─── */

export type FormFieldType =
  | "text" | "number" | "date" | "email" | "phone"
  | "select" | "multiselect" | "radio"
  | "textarea"
  | "image" | "file"
  | "rating" | "matrix"
  | "address" | "idcard";

export interface FormFieldConfig {
  id: string;
  sourceField: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  visible: boolean;
  placeholder?: string;
  description?: string;
  // rating
  maxRating?: number;
  // matrix
  matrixRows?: string[];
  matrixCols?: string[];
  // file/image
  maxFileSize?: number; // MB
  acceptTypes?: string;
  // validation
  noDuplicate?: boolean;
  pattern?: string;
}

export interface FormTheme {
  primaryColor: string;
  bgColor: string;
  headerImage: string;
  logo: string;
  font: string;
}

export interface FormSettings {
  deadline: string | null;
  submitLimit: number | null; // max submissions per user
  allowModify: boolean;
  showProgressBar: boolean;
  successMessage: string;
  requireLogin: boolean;
  ipLimit: number | null; // same IP max submissions
}

export interface FormConfig {
  id: string;
  title: string;
  description: string;
  fields: FormFieldConfig[];
  theme: FormTheme;
  settings: FormSettings;
  createdAt: number;
  updatedAt: number;
}

export interface FormSubmission {
  id: string;
  formId: string;
  data: Record<string, string>;
  submittedAt: number;
  ip?: string;
}

/* ─── Constants ─── */

const FIELD_TYPES: { value: FormFieldType; label: string; icon: React.ReactNode; category: string }[] = [
  { value: "text", label: "文本", icon: <AlignLeft className="w-4 h-4" />, category: "基础" },
  { value: "number", label: "数字", icon: <Hash className="w-4 h-4" />, category: "基础" },
  { value: "date", label: "日期", icon: <Calendar className="w-4 h-4" />, category: "基础" },
  { value: "email", label: "邮箱", icon: <Mail className="w-4 h-4" />, category: "联系" },
  { value: "phone", label: "手机", icon: <Phone className="w-4 h-4" />, category: "联系" },
  { value: "idcard", label: "身份证", icon: <CreditCard className="w-4 h-4" />, category: "联系" },
  { value: "address", label: "地址", icon: <MapPin className="w-4 h-4" />, category: "联系" },
  { value: "select", label: "下拉选择", icon: <ChevronDown className="w-4 h-4" />, category: "选择" },
  { value: "multiselect", label: "多选", icon: <CheckSquare className="w-4 h-4" />, category: "选择" },
  { value: "radio", label: "单选", icon: <CircleDot className="w-4 h-4" />, category: "选择" },
  { value: "textarea", label: "多行文本", icon: <AlignLeft className="w-4 h-4" />, category: "文本" },
  { value: "image", label: "图片上传", icon: <ImageIcon className="w-4 h-4" />, category: "附件" },
  { value: "file", label: "文件上传", icon: <FileUp className="w-4 h-4" />, category: "附件" },
  { value: "rating", label: "评分", icon: <Star className="w-4 h-4" />, category: "高级" },
  { value: "matrix", label: "矩阵量表", icon: <ListChecks className="w-4 h-4" />, category: "高级" },
];

const PRESET_THEMES: { name: string; primary: string; bg: string }[] = [
  { name: "经典蓝", primary: "#3B82F6", bg: "#F0F7FF" },
  { name: "活力橙", primary: "#F97316", bg: "#FFF7ED" },
  { name: "雅致绿", primary: "#10B981", bg: "#ECFDF5" },
  { name: "热情红", primary: "#EF4444", bg: "#FEF2F2" },
  { name: "神秘紫", primary: "#8B5CF6", bg: "#F5F3FF" },
  { name: "沉稳灰", primary: "#6B7280", bg: "#F9FAFB" },
];

const STORAGE_KEY = "datainsight-forms";
const SUBMISSIONS_KEY = "datainsight-form-submissions";

/* ─── Helpers ─── */

function genId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4);
}

function inferOptions(
  rows: Record<string, unknown>[],
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

function loadSubmissions(formId?: string): FormSubmission[] {
  try {
    const all = readBusinessData<FormSubmission[]>(SUBMISSIONS_KEY) || [];
    return formId ? all.filter((s) => s.formId === formId) : all;
  } catch {
    return [];
  }
}

function saveSubmissions(subs: FormSubmission[]) {
  storeBusinessData(SUBMISSIONS_KEY, subs);
}

/* ─── Main Component ─── */

export function FormBuilder({
  data,
  onDataChange,
}: {
  data: ParsedData | null;
  onDataChange: Dispatch<SetStateAction<ParsedData | null>>;
}) {
  const headers = data?.headers ?? [];
  const rows = data?.rows ?? [];

  const { t } = useI18n();
  const [configs, setConfigs] = useState<FormConfig[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [editing, setEditing] = useState<FormConfig | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [editTab, setEditTab] = useState<"fields" | "theme" | "settings">("fields");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrFormId, setQrFormId] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [dataViewFormId, setDataViewFormId] = useState<string | null>(null);

  // 权限检查
  const { user, isLoggedIn, onLoginRequired } = useAuth();
  // 表单收集权限：依赖 upload 权限，无 upload 则无 form 权限
  const canCreateForm = user ? (user.permissions?.upload !== false && user.permissions?.form !== false) : false;
  const hasFormPermission = user?.permissions?.form !== false;

  const saveConfigs = useCallback((next: FormConfig[]) => {
    setConfigs(next);
    safeSetItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const startNew = useCallback(() => {
    const newConfig: FormConfig = {
      id: genId(),
      title: "新建数据收集表单",
      description: "请填写以下信息",
      fields: data ? data.headers.map((h) => ({
        id: genId(),
        sourceField: h,
        label: h,
        type: "text" as FormFieldType,
        required: false,
        visible: true,
        options: inferOptions(data.rows, h),
        placeholder: "",
        description: "",
      })) : [{
        id: genId(),
        sourceField: "字段1",
        label: "字段1",
        type: "text" as FormFieldType,
        required: false,
        visible: true,
        options: [],
        placeholder: "",
        description: "",
      }],
      theme: { primaryColor: "#3B82F6", bgColor: "#F0F7FF", headerImage: "", logo: "", font: "sans-serif" },
      settings: {
        deadline: null, submitLimit: null, allowModify: false,
        showProgressBar: true, successMessage: "提交成功，感谢您的参与！", requireLogin: false, ipLimit: null,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setEditing(newConfig);
    setEditTab("fields");
  }, [data]);

  const handleCreateForm = useCallback(() => {
    if (!isLoggedIn) {
      onLoginRequired?.();
      return;
    }
    if (!canCreateForm) {
      toast.error("管理员已禁用表单收集功能");
      return;
    }
    startNew();
  }, [isLoggedIn, canCreateForm, onLoginRequired, startNew]);

  const addField = useCallback(() => {
    if (!editing) return;
    const newField: FormFieldConfig = {
      id: genId(),
      sourceField: headers[0] || "字段",
      label: "新字段",
      type: "text",
      required: false,
      visible: true,
      placeholder: "",
      description: "",
    };
    setEditing({ ...editing, fields: [...editing.fields, newField], updatedAt: Date.now() });
  }, [editing, headers]);

  const updateField = useCallback(
    (index: number, patch: Partial<FormFieldConfig>) => {
      if (!editing) return;
      const next = { ...editing, updatedAt: Date.now() };
      next.fields = next.fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
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
      setEditing({ ...editing, fields: editing.fields.filter((_, i) => i !== index), updatedAt: Date.now() });
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
      // also delete submissions
      const subs = loadSubmissions();
      saveSubmissions(subs.filter((s) => s.formId !== id));
      toast.success("表单及收集数据已删除");
    },
    [configs, saveConfigs]
  );

  const getShareUrl = useCallback((id: string) => {
    const domain = typeof window !== "undefined" ? window.location.origin : "";
    return `${domain}/form?id=${id}`;
  }, []);

  const copyUrl = useCallback(
    (id: string) => {
      navigator.clipboard.writeText(getShareUrl(id));
      toast.success("分享链接已复制到剪贴板");
    },
    [getShareUrl]
  );

  const generateQR = useCallback(async (id: string) => {
    setQrFormId(id);
    try {
      const url = getShareUrl(id);
      const dataUrl = await QRCode.toDataURL(url, {
        width: 300, margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
      setQrDialogOpen(true);
    } catch {
      toast.error("二维码生成失败");
    }
  }, [getShareUrl]);

  const downloadQR = useCallback(() => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `表单二维码_${qrFormId}.png`;
    a.click();
    toast.success("二维码已下载");
  }, [qrDataUrl, qrFormId]);

  const exportSubmissions = useCallback(async (formConfig: FormConfig) => {
    const subs = loadSubmissions(formConfig.id);
    if (subs.length === 0) {
      toast.error("暂无收集数据可导出");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('收集数据');

    // Build header list: 提交时间 + all field labels
    const headers = ['提交时间', ...formConfig.fields.map(f => f.label)];
    worksheet.columns = headers.map(h => ({ header: h, key: h, width: 20 }));

    // Add data rows
    subs.forEach((s) => {
      const row: Record<string, string> = { 提交时间: new Date(s.submittedAt).toLocaleString() };
      formConfig.fields.forEach((f) => {
        row[f.label] = s.data[f.id] || "";
      });
      worksheet.addRow(headers.map(h => row[h] ?? ''));
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formConfig.title}_收集数据.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`已导出 ${subs.length} 条数据`);
  }, []);

  /* ─── QR Code Dialog ─── */
  const qrDialog = (
    <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            表单二维码
          </DialogTitle>
          <DialogDescription>{t('txt.扫描二维码或分享链接收集数据')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {qrDataUrl && (
            <div className="flex justify-center p-4 bg-white rounded-md">
              <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
            </div>
          )}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <span className="text-sm flex-1 truncate">{getShareUrl(qrFormId)}</span>
            <Button variant="outline" size="sm" onClick={() => copyUrl(qrFormId)}>
              <Copy className="w-3 h-3 mr-1" /> 复制
            </Button>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={downloadQR}>
              <Download className="w-4 h-4 mr-1" /> 下载二维码
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => copyUrl(qrFormId)}>
              <Copy className="w-4 h-4 mr-1" /> 复制链接
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  /* ─── Data View ─── */
  if (dataViewFormId) {
    const formConfig = configs.find((c) => c.id === dataViewFormId);
    if (!formConfig) {
      setDataViewFormId(null);
      return null;
    }
    const submissions = loadSubmissions(dataViewFormId);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Table2 className="w-5 h-5" />
              收集数据 - {formConfig.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              共 {submissions.length} 条提交记录
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportSubmissions(formConfig)}>
              <FileSpreadsheet className="w-4 h-4 mr-1" /> 导出Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDataViewFormId(null)}>
              返回
            </Button>
          </div>
        </div>

        {submissions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t('txt.暂无提交数据')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('txt.分享表单链接后提交的数据将在此展示')}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">{t('txt.提交时间')}</th>
                    {formConfig.fields.filter((f) => f.visible).map((f) => (
                      <th key={f.id} className="px-3 py-2 text-left font-medium">
                        {f.label}
                        {f.required && <span className="text-red-500 ml-1">*</span>}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-left font-medium">{t('txt.操作')}</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub, idx) => (
                    <tr key={sub.id} className="border-b hover:bg-muted/30">
                      <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap truncate">
                        {new Date(sub.submittedAt).toLocaleString()}
                      </td>
                      {formConfig.fields.filter((f) => f.visible).map((f) => (
                        <td key={f.id} className="px-3 py-2 max-w-[200px] truncate">
                          {sub.data[f.id] || "-"}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 h-7"
                          onClick={() => {
                            const all = loadSubmissions();
                            saveSubmissions(all.filter((s) => s.id !== sub.id));
                            setDataViewFormId(dataViewFormId); // force refresh
                            toast.success("已删除");
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
        {qrDialog}
      </div>
    );
  }

  /* ─── Preview ─── */
  if (previewMode && editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('txt.表单预览')}</h3>
          <Button variant="outline" onClick={() => setPreviewMode(false)}>
            返回编辑
          </Button>
        </div>
        <FormRenderer config={editing} readOnly />
      </div>
    );
  }

  /* ─── Editor ─── */
  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('txt.编辑表单')}</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewMode(true)}>
              <Eye className="w-4 h-4 mr-1" /> 预览
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>{t('txt.取消')}</Button>
            <Button size="sm" onClick={saveEditing}>{t('txt.保存表单')}</Button>
          </div>
        </div>

        <Tabs value={editTab} onValueChange={(v) => setEditTab(v as typeof editTab)}>
          <TabsList>
            <TabsTrigger value="fields"><ListChecks className="w-4 h-4 mr-1" /> 字段</TabsTrigger>
            <TabsTrigger value="theme"><Palette className="w-4 h-4 mr-1" /> 主题</TabsTrigger>
            <TabsTrigger value="settings"><Settings2 className="w-4 h-4 mr-1" /> 设置</TabsTrigger>
          </TabsList>

          {/* ─── Fields Tab ─── */}
          <TabsContent value="fields" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <Label>{t('txt.表单标题')}</Label>
                  <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value, updatedAt: Date.now() })} />
                </div>
                <div>
                  <Label>{t('txt.表单描述')}</Label>
                  <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value, updatedAt: Date.now() })} rows={2} />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <h4 className="font-medium">字段列表 ({editing.fields.length})</h4>
              <Button variant="outline" size="sm" onClick={addField}>
                <Plus className="w-4 h-4 mr-1" /> 添加字段
              </Button>
            </div>

            {editing.fields.map((field, index) => (
              <Card key={field.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground mt-2 cursor-grab" />
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">{t('txt.字段名称')}</Label>
                          <Input value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">{t('txt.关联数据列')}</Label>
                          <Select value={field.sourceField} onValueChange={(v) => updateField(index, { sourceField: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {headers.map((h) => (<SelectItem key={h} value={h}>{h}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">{t('txt.字段类型')}</Label>
                          <Select value={field.type} onValueChange={(v) => updateField(index, { type: v as FormFieldType })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(
                                FIELD_TYPES.reduce<Record<string, typeof FIELD_TYPES>>((acc, t) => {
                                  (acc[t.category] = acc[t.category] || []).push(t);
                                  return acc;
                                }, {})
                              ).map(([cat, types]) => (
                                <React.Fragment key={cat}>
                                  <SelectItem value={`__header_${cat}`} disabled className="font-semibold text-muted-foreground">
                                    ── {cat} ──
                                  </SelectItem>
                                  {types.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                      {t.label}
                                    </SelectItem>
                                  ))}
                                </React.Fragment>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">{t('txt.提示文字')}</Label>
                          <Input
                            placeholder={t("ph.请输入")}
                            value={field.placeholder || ""}
                            onChange={(e) => updateField(index, { placeholder: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{t('txt.字段说明')}</Label>
                          <Input
                            placeholder={t("ph.帮助填写者理解")}
                            value={field.description || ""}
                            onChange={(e) => updateField(index, { description: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Type-specific options */}
                      {["select", "multiselect", "radio"].includes(field.type) && (
                        <div>
                          <Label className="text-xs">{t('txt.选项逗号分隔')}</Label>
                          <Input
                            value={(field.options || []).join(", ")}
                            onChange={(e) =>
                              updateField(index, {
                                options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                              })
                            }
                            placeholder={t("ph.选项1选项2选项3")}
                          />
                        </div>
                      )}

                      {field.type === "rating" && (
                        <div className="flex items-center gap-3">
                          <Label className="text-xs">{t('txt.最高评分')}</Label>
                          <Select
                            value={String(field.maxRating || 5)}
                            onValueChange={(v) => updateField(index, { maxRating: Number(v) })}
                          >
                            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[3, 5, 7, 10].map((n) => (<SelectItem key={n} value={String(n)}>{n}星</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {field.type === "matrix" && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">{t('txt.行标题逗号分隔')}</Label>
                            <Input
                              value={(field.matrixRows || []).join(", ")}
                              onChange={(e) => updateField(index, { matrixRows: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                              placeholder={t("ph.服务态度专业能力")}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t('txt.列标题逗号分隔')}</Label>
                            <Input
                              value={(field.matrixCols || []).join(", ")}
                              onChange={(e) => updateField(index, { matrixCols: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                              placeholder={t("ph.非常满意满意一般不满意")}
                            />
                          </div>
                        </div>
                      )}

                      {["image", "file"].includes(field.type) && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">{t('txt.最大文件大小MB')}</Label>
                            <Input
                              type="number"
                              value={field.maxFileSize || 10}
                              onChange={(e) => updateField(index, { maxFileSize: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t('txt.允许类型')}</Label>
                            <Input
                              value={field.acceptTypes || (field.type === "image" ? "image/*" : "*")}
                              onChange={(e) => updateField(index, { acceptTypes: e.target.value })}
                              placeholder="image/* 或 .pdf,.doc"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-4 pt-1">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={field.required} onCheckedChange={(c) => updateField(index, { required: c as boolean })} />
                          必填
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={field.noDuplicate || false} onCheckedChange={(c) => updateField(index, { noDuplicate: c as boolean })} />
                          不允许重复
                        </label>
                        <div className="flex-1" />
                        <Button variant="ghost" size="sm" onClick={() => removeField(index)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ─── Theme Tab ─── */}
          <TabsContent value="theme" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">{t('txt.预设主题')}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {PRESET_THEMES.map((t) => (
                    <button
                      key={t.name}
                      className="flex flex-col items-center gap-2 p-3 rounded-md border-2 hover:border-primary/50 transition"
                      style={{ borderColor: editing.theme.primaryColor === t.primary ? t.primary : undefined }}
                      onClick={() => setEditing({ ...editing, theme: { ...editing.theme, primaryColor: t.primary, bgColor: t.bg }, updatedAt: Date.now() })}
                    >
                      <div className="w-10 h-10 rounded-md" style={{ backgroundColor: t.primary }} />
                      <span className="text-xs">{t.name}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">{t('txt.自定义配色')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('txt.主题色')}</Label>
                    <div className="flex gap-2 mt-1">
                      <input type="color" value={editing.theme.primaryColor} onChange={(e) => setEditing({ ...editing, theme: { ...editing.theme, primaryColor: e.target.value }, updatedAt: Date.now() })} className="w-10 h-10 rounded cursor-pointer" />
                      <Input value={editing.theme.primaryColor} onChange={(e) => setEditing({ ...editing, theme: { ...editing.theme, primaryColor: e.target.value }, updatedAt: Date.now() })} />
                    </div>
                  </div>
                  <div>
                    <Label>{t('txt.背景色')}</Label>
                    <div className="flex gap-2 mt-1">
                      <input type="color" value={editing.theme.bgColor} onChange={(e) => setEditing({ ...editing, theme: { ...editing.theme, bgColor: e.target.value }, updatedAt: Date.now() })} className="w-10 h-10 rounded cursor-pointer" />
                      <Input value={editing.theme.bgColor} onChange={(e) => setEditing({ ...editing, theme: { ...editing.theme, bgColor: e.target.value }, updatedAt: Date.now() })} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">{t('txt.头图与Logo')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('txt.头图URL')}</Label>
                  <Input
                    placeholder={t("ph.输入图片URL或留空")}
                    value={editing.theme.headerImage}
                    onChange={(e) => setEditing({ ...editing, theme: { ...editing.theme, headerImage: e.target.value }, updatedAt: Date.now() })}
                  />
                </div>
                <div>
                  <Label>Logo URL</Label>
                  <Input
                    placeholder={t("ph.输入Logo图片URL或留空")}
                    value={editing.theme.logo}
                    onChange={(e) => setEditing({ ...editing, theme: { ...editing.theme, logo: e.target.value }, updatedAt: Date.now() })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Settings Tab ─── */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" /> 收集规则</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('txt.截止时间')}</Label>
                    <Input
                      type="datetime-local"
                      value={editing.settings.deadline || ""}
                      onChange={(e) => setEditing({ ...editing, settings: { ...editing.settings, deadline: e.target.value || null }, updatedAt: Date.now() })}
                    />
                  </div>
                  <div>
                    <Label>{t('txt.每人限填次数')}</Label>
                    <Select
                      value={String(editing.settings.submitLimit ?? 0)}
                      onValueChange={(v) => setEditing({ ...editing, settings: { ...editing.settings, submitLimit: v === "0" ? null : Number(v) }, updatedAt: Date.now() })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">{t('txt.不限')}</SelectItem>
                        <SelectItem value="1">1次</SelectItem>
                        <SelectItem value="2">2次</SelectItem>
                        <SelectItem value="3">3次</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('txt.允许修改已提交数据')}</Label>
                    <p className="text-xs text-muted-foreground">{t('txt.填写者可以在提交后修改数据')}</p>
                  </div>
                  <Switch
                    checked={editing.settings.allowModify}
                    onCheckedChange={(v) => setEditing({ ...editing, settings: { ...editing.settings, allowModify: v }, updatedAt: Date.now() })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('txt.显示填写进度条')}</Label>
                    <p className="text-xs text-muted-foreground">{t('txt.在表单顶部显示完成进度')}</p>
                  </div>
                  <Switch
                    checked={editing.settings.showProgressBar}
                    onCheckedChange={(v) => setEditing({ ...editing, settings: { ...editing.settings, showProgressBar: v }, updatedAt: Date.now() })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> 安全设置</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('txt.需要登录才能填写')}</Label>
                    <p className="text-xs text-muted-foreground">{t('txt.防止恶意刷表')}</p>
                  </div>
                  <Switch
                    checked={editing.settings.requireLogin}
                    onCheckedChange={(v) => setEditing({ ...editing, settings: { ...editing.settings, requireLogin: v }, updatedAt: Date.now() })}
                  />
                </div>
                <div>
                  <Label>{t('txt.同一IP限制提交次数')}</Label>
                  <Select
                    value={String(editing.settings.ipLimit ?? 0)}
                    onValueChange={(v) => setEditing({ ...editing, settings: { ...editing.settings, ipLimit: v === "0" ? null : Number(v) }, updatedAt: Date.now() })}
                  >
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">{t('txt.不限')}</SelectItem>
                      <SelectItem value="1">1次</SelectItem>
                      <SelectItem value="3">3次</SelectItem>
                      <SelectItem value="5">5次</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">{t('txt.提交后显示')}</CardTitle></CardHeader>
              <CardContent>
                <div>
                  <Label>{t('txt.成功提示语')}</Label>
                  <Textarea
                    value={editing.settings.successMessage}
                    onChange={(e) => setEditing({ ...editing, settings: { ...editing.settings, successMessage: e.target.value }, updatedAt: Date.now() })}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {qrDialog}
      </div>
    );
  }

  /* ─── Form List ─── */
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ToggleLeft className="w-5 h-5" />
          表单收集
        </h3>
        <Button onClick={handleCreateForm} disabled={!canCreateForm} title={!canCreateForm ? "管理员已禁用表单收集功能" : undefined}>
          <Plus className="w-4 h-4 mr-1" /> 新建表单
        </Button>
      </div>

      {configs.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <ToggleLeft className="w-10 h-10 mx-auto mb-2 opacity-30" />
            暂无表单，点击上方按钮创建
          </CardContent>
        </Card>
      )}

      {configs.map((config) => {
        const subCount = loadSubmissions(config.id).length;
        return (
          <Card key={config.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.theme?.primaryColor || '#3b82f6' }} />
                  <CardTitle className="text-base">{config.title || '未命名表单'}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(config); setEditTab("fields"); }}>
                    编辑
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDataViewFormId(config.id)}>
                    <Table2 className="w-4 h-4 mr-1" /> 数据({subCount})
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => generateQR(config.id)}>
                    <QrCode className="w-4 h-4 mr-1" /> 二维码
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => copyUrl(config.id)}>
                    <Copy className="w-4 h-4 mr-1" /> 链接
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => exportSubmissions(config)}>
                    <Download className="w-4 h-4 mr-1" /> 导出
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteConfig(config.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{config.description}</p>
              <div className="flex flex-wrap gap-1">
                {config.fields.filter((f) => f.visible).map((f) => (
                  <Badge key={f.id} variant="secondary" className="text-xs">
                    {f.label}{f.required && "*"}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{getShareUrl(config.id)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> {subCount} 条数据
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(config.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {qrDialog}
    </div>
  );
}

/* ─── Form Renderer ─── */

export function FormRenderer({
  config,
  readOnly,
  onSubmit,
}: {
  config: FormConfig;
  readOnly?: boolean;
  onSubmit?: (data: Record<string, string>) => void;
}) {
  const { t } = useI18n();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string[]>>({});

  const visibleFields = useMemo(() => config.fields.filter((f) => f.visible), [config.fields]);
  const filledCount = useMemo(
    () => visibleFields.filter((f) => values[f.id] && values[f.id].trim()).length,
    [visibleFields, values]
  );
  const progress = visibleFields.length > 0 ? Math.round((filledCount / visibleFields.length) * 100) : 0;

  const handleSubmit = useCallback(() => {
    const nextErrors: Record<string, string> = {};
    config.fields.forEach((f) => {
      if (f.required && f.visible) {
        if (!values[f.id] || !values[f.id].trim()) {
          nextErrors[f.id] = "此项为必填";
        }
      }
      // email validation
      if (f.type === "email" && values[f.id] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[f.id])) {
        nextErrors[f.id] = "请输入有效的邮箱地址";
      }
      // phone validation
      if (f.type === "phone" && values[f.id] && !/^1[3-9]\d{9}$/.test(values[f.id])) {
        nextErrors[f.id] = "请输入有效的手机号";
      }
      // idcard validation
      if (f.type === "idcard" && values[f.id] && !/^\d{17}[\dXx]$/.test(values[f.id])) {
        nextErrors[f.id] = "请输入有效的身份证号";
      }
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onSubmit?.(values);
    }
  }, [config, values, onSubmit]);

  const setVal = useCallback((fieldId: string, val: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: val }));
    setErrors((prev) => { const n = { ...prev }; delete n[fieldId]; return n; });
  }, []);

  const handleFileUpload = useCallback((fieldId: string, files: FileList | null, acceptTypes: string) => {
    if (!files || files.length === 0) return;
    const names: string[] = [];
    Array.from(files).forEach((file) => {
      names.push(file.name);
      // In a real app, upload to storage. Here we store the name.
    });
    setVal(fieldId, names.join(", "));
    setUploadedFiles((prev) => ({ ...prev, [fieldId]: names }));
  }, [setVal]);

  const renderField = (field: FormFieldConfig) => {
    const val = values[field.id] || "";
    const err = errors[field.id];

    const fieldContent = (() => {
      switch (field.type) {
        case "textarea":
          return (
            <textarea
              className="w-full mt-1 min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={val}
              onChange={(e) => setVal(field.id, e.target.value)}
              placeholder={field.placeholder}
              disabled={readOnly}
            />
          );

        case "select":
          return (
            <Select value={val} onValueChange={(v) => setVal(field.id, v)} disabled={readOnly}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={field.placeholder || "请选择"} /></SelectTrigger>
              <SelectContent>
                {(field.options || []).map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
              </SelectContent>
            </Select>
          );

        case "multiselect":
          return (
            <div className="mt-1 flex flex-wrap gap-2">
              {(field.options || []).map((o) => {
                const selected = val.split(",").includes(o);
                return (
                  <label
                    key={o}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border cursor-pointer transition ${
                      selected ? "text-white border-transparent" : "bg-background hover:bg-muted"
                    }`}
                    style={selected ? { backgroundColor: config.theme?.primaryColor } : undefined}
                  >
                    <input type="checkbox" className="sr-only" checked={selected}
                      onChange={() => {
                        const current = val.split(",").filter(Boolean);
                        const next = current.includes(o) ? current.filter((v) => v !== o) : [...current, o];
                        setVal(field.id, next.join(","));
                      }}
                      disabled={readOnly}
                    />
                    {o}
                  </label>
                );
              })}
            </div>
          );

        case "radio":
          return (
            <div className="mt-1 space-y-2">
              {(field.options || []).map((o) => (
                <label key={o} className="flex items-center gap-2 cursor-pointer">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition ${
                    val === o ? "border-primary" : "border-muted-foreground/30"
                  }`}>
                    {val === o && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.theme?.primaryColor }} />}
                  </div>
                  <input type="radio" name={field.id} value={o} className="sr-only"
                    checked={val === o} onChange={() => setVal(field.id, o)} disabled={readOnly}
                  />
                  <span className="text-sm">{o}</span>
                </label>
              ))}
            </div>
          );

        case "rating":
          return (
            <div className="mt-1 flex gap-1">
              {Array.from({ length: field.maxRating || 5 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className="transition-transform hover:scale-110"
                  onClick={() => !readOnly && setVal(field.id, String(i + 1))}
                  disabled={readOnly}
                >
                  <Star
                    className={`w-7 h-7 ${i < Number(val) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                  />
                </button>
              ))}
            </div>
          );

        case "matrix":
          return (
            <div className="mt-1 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left" />
                    {(field.matrixCols || ["非常满意", "满意", "一般", "不满意"]).map((col) => (
                      <th key={col} className="px-2 py-1 text-center text-xs">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(field.matrixRows || ["行1", "行2"]).map((row) => (
                    <tr key={row} className="border-t">
                      <td className="px-2 py-2 text-sm">{row}</td>
                      {(field.matrixCols || ["非常满意", "满意", "一般", "不满意"]).map((col) => {
                        const key = `${field.id}_${row}`;
                        return (
                          <td key={col} className="px-2 py-2 text-center">
                            <input
                              type="radio"
                              name={key}
                              checked={(values[key] || "") === col}
                              onChange={() => setVal(key, col)}
                              disabled={readOnly}
                              className="accent-primary"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );

        case "image":
          return (
            <div className="mt-1">
              <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition ${readOnly ? "pointer-events-none" : ""}`}>
                <ImageIcon className="w-8 h-8 text-muted-foreground mb-1" />
                <span className="text-sm text-muted-foreground">{t('txt.点击上传图片')}</span>
                <span className="text-xs text-muted-foreground">最大 {field.maxFileSize || 10}MB</span>
                <input type="file" className="sr-only" accept={field.acceptTypes || "image/*"} multiple
                  onChange={(e) => handleFileUpload(field.id, e.target.files, field.acceptTypes || "image/*")}
                  disabled={readOnly}
                />
              </label>
              {uploadedFiles[field.id] && (
                <div className="mt-2 space-y-1">
                  {uploadedFiles[field.id].map((name, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ImageIcon className="w-3 h-3" /> {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );

        case "file":
          return (
            <div className="mt-1">
              <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition ${readOnly ? "pointer-events-none" : ""}`}>
                <FileUp className="w-8 h-8 text-muted-foreground mb-1" />
                <span className="text-sm text-muted-foreground">{t('txt.点击上传文件')}</span>
                <span className="text-xs text-muted-foreground">最大 {field.maxFileSize || 10}MB</span>
                <input type="file" className="sr-only" accept={field.acceptTypes || "*"} multiple
                  onChange={(e) => handleFileUpload(field.id, e.target.files, field.acceptTypes || "*")}
                  disabled={readOnly}
                />
              </label>
              {uploadedFiles[field.id] && (
                <div className="mt-2 space-y-1">
                  {uploadedFiles[field.id].map((name, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileUp className="w-3 h-3" /> {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );

        case "address":
          return (
            <div className="mt-1 grid grid-cols-3 gap-2">
              <Input placeholder={t("ph.省市")} value={val.split("|")[0] || ""} onChange={(e) => { const parts = val.split("|"); parts[0] = e.target.value; setVal(field.id, parts.join("|")); }} disabled={readOnly} />
              <Input placeholder={t("ph.区县")} value={val.split("|")[1] || ""} onChange={(e) => { const parts = val.split("|"); parts[1] = e.target.value; setVal(field.id, parts.join("|")); }} disabled={readOnly} />
              <Input placeholder={t("ph.详细地址")} value={val.split("|")[2] || ""} onChange={(e) => { const parts = val.split("|"); parts[2] = e.target.value; setVal(field.id, parts.join("|")); }} disabled={readOnly} />
            </div>
          );

        case "phone":
          return <Input className="mt-1" type="tel" placeholder={field.placeholder || "请输入手机号"} value={val} onChange={(e) => setVal(field.id, e.target.value)} disabled={readOnly} maxLength={11} />;

        case "email":
          return <Input className="mt-1" type="email" placeholder={field.placeholder || "请输入邮箱"} value={val} onChange={(e) => setVal(field.id, e.target.value)} disabled={readOnly} />;

        case "idcard":
          return <Input className="mt-1" placeholder={field.placeholder || "请输入身份证号"} value={val} onChange={(e) => setVal(field.id, e.target.value)} disabled={readOnly} maxLength={18} />;

        case "number":
          return <Input className="mt-1" type="number" placeholder={field.placeholder} value={val} onChange={(e) => setVal(field.id, e.target.value)} disabled={readOnly} />;

        case "date":
          return <Input className="mt-1" type="date" placeholder={field.placeholder} value={val} onChange={(e) => setVal(field.id, e.target.value)} disabled={readOnly} />;

        default:
          return <Input className="mt-1" type="text" placeholder={field.placeholder} value={val} onChange={(e) => setVal(field.id, e.target.value)} disabled={readOnly} />;
      }
    })();

    return (
      <div key={field.id} className="space-y-1">
        <Label className="flex items-center gap-1">
          {field.label}
          {field.required && <span className="text-red-500">*</span>}
        </Label>
        {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
        {fieldContent}
        {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto" style={{ backgroundColor: config.theme?.bgColor || '#ffffff' }}>
      {/* Header */}
      {config.theme?.headerImage && (
        <div className="w-full h-40 bg-cover bg-center rounded-t-lg" style={{ backgroundImage: `url(${config.theme?.headerImage})` }} />
      )}

      <div className="bg-card rounded-md shadow-sm border">
        {/* Progress bar */}
        {config.settings.showProgressBar && !readOnly && (
          <div className="h-1 bg-muted rounded-t-lg overflow-hidden">
            <div className="h-full transition-all duration-300 rounded-full" style={{ width: `${progress}%`, backgroundColor: config.theme?.primaryColor }} />
          </div>
        )}

        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            {config.theme?.logo && <img src={config.theme?.logo} alt="Logo" className="w-8 h-8 rounded" />}
            <h2 className="text-xl font-semibold">{config.title}</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
          {config.settings.showProgressBar && !readOnly && (
            <p className="text-xs text-muted-foreground mt-2">已填写 {filledCount}/{visibleFields.length} 项 ({progress}%)</p>
          )}
        </div>

        <div className="px-6 py-4 space-y-5">
          {visibleFields.map((field) => renderField(field))}
        </div>

        {!readOnly && (
          <div className="px-6 pb-6">
            <Button className="w-full text-base py-5" style={{ backgroundColor: config.theme?.primaryColor }} onClick={handleSubmit}>
              提交
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
