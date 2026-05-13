"use client";

import { useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { request } from "@/lib/request";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { t } = useI18n();
  const [type, setType] = useState("bug");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      await request("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ type, title: title.trim(), content: content.trim(), contact: contact.trim() || undefined }),
      });
      setResult({ success: true, message: t("feedback.success") });
      setTitle("");
      setContent("");
      setContact("");
    } catch {
      setResult({ success: false, message: t("feedback.error") });
    } finally {
      setSubmitting(false);
    }
  }, [type, title, content, contact, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("feedback.title")}
          </DialogTitle>
          <DialogDescription>{t("feedback.subtitle")}</DialogDescription>
        </DialogHeader>

        {result?.success ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-center text-muted-foreground">{result.message}</p>
            <Button onClick={() => { setResult(null); onOpenChange(false); }}>
              {t("common.close")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("feedback.type")}</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">{t("feedback.typeBug")}</SelectItem>
                  <SelectItem value="feature">{t("feedback.typeFeature")}</SelectItem>
                  <SelectItem value="question">{t("feedback.typeQuestion")}</SelectItem>
                  <SelectItem value="complaint">{t("feedback.typeComplaint")}</SelectItem>
                  <SelectItem value="other">{t("feedback.typeOther")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">{t("feedback.titleLabel")}</label>
              <Input
                className="mt-1"
                placeholder={t("feedback.titlePlaceholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t("feedback.contentLabel")}</label>
              <Textarea
                className="mt-1 min-h-[120px]"
                placeholder={t("feedback.contentPlaceholder")}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={2000}
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t("feedback.contactLabel")}</label>
              <Input
                className="mt-1"
                placeholder={t("feedback.contactPlaceholder")}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                type="email"
              />
            </div>

            {result && !result.success && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                {result.message}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!title.trim() || !content.trim() || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("feedback.submitting")}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t("feedback.submit")}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
