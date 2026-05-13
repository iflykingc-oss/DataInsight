"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { request } from "@/lib/request";
import {
  MessageSquare,
  Reply,
  Trash2,
  RefreshCw,
  Loader2,
  Filter,
  Search,
  User,
} from "lucide-react";

interface FeedbackItem {
  id: number;
  userId: number | null;
  type: string;
  title: string;
  content: string;
  contact: string | null;
  status: string;
  priority: string;
  adminReply: string | null;
  repliedBy: number | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function FeedbackAdminPanel() {
  const { t } = useI18n();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<FeedbackItem | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<{ data: FeedbackItem[]; stats: typeof stats }>("/api/admin/feedback");
      setFeedback(res.data);
      setStats(res.stats);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleReply = useCallback(async () => {
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    try {
      await request(`/api/admin/feedback/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify({
          action: "reply",
          adminReply: replyText.trim(),
          status: "resolved",
        }),
      });
      setReplyText("");
      setSelected(null);
      fetchFeedback();
    } catch {
      // ignore
    } finally {
      setReplying(false);
    }
  }, [selected, replyText, fetchFeedback]);

  const handleUpdateStatus = useCallback(async (id: number, status: string) => {
    try {
      await request(`/api/admin/feedback/${id}`, {
        method: "PUT",
        body: JSON.stringify({ action: "status", status }),
      });
      fetchFeedback();
    } catch {
      // ignore
    }
  }, [fetchFeedback]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm(t("feedback.deleteConfirm"))) return;
    try {
      await request(`/api/admin/feedback/${id}`, { method: "DELETE" });
      fetchFeedback();
    } catch {
      // ignore
    }
  }, [fetchFeedback, t]);

  const filtered = feedback.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        (item.contact && item.contact.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const statusColor: Record<string, string> = {
    open: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    resolved: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800",
  };

  const typeColor: Record<string, string> = {
    bug: "bg-red-100 text-red-800",
    feature: "bg-purple-100 text-purple-800",
    question: "bg-cyan-100 text-cyan-800",
    complaint: "bg-orange-100 text-orange-800",
    other: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: t("feedback.all"), value: stats.total, color: "bg-primary/10" },
          { label: t("feedback.statusOpen"), value: stats.open, color: "bg-yellow-100" },
          { label: t("feedback.statusInProgress"), value: stats.inProgress, color: "bg-blue-100" },
          { label: t("feedback.statusResolved"), value: stats.resolved, color: "bg-green-100" },
          { label: t("feedback.statusClosed"), value: stats.closed, color: "bg-gray-100" },
        ].map((s) => (
          <Card key={s.label} className={s.color}>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("feedback.filterByStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("feedback.all")}</SelectItem>
              <SelectItem value="open">{t("feedback.statusOpen")}</SelectItem>
              <SelectItem value="in_progress">{t("feedback.statusInProgress")}</SelectItem>
              <SelectItem value="resolved">{t("feedback.statusResolved")}</SelectItem>
              <SelectItem value="closed">{t("feedback.statusClosed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("feedback.filterByType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("feedback.all")}</SelectItem>
            <SelectItem value="bug">{t("feedback.typeBug")}</SelectItem>
            <SelectItem value="feature">{t("feedback.typeFeature")}</SelectItem>
            <SelectItem value="question">{t("feedback.typeQuestion")}</SelectItem>
            <SelectItem value="complaint">{t("feedback.typeComplaint")}</SelectItem>
            <SelectItem value="other">{t("feedback.typeOther")}</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button variant="outline" size="sm" onClick={fetchFeedback} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t("feedback.noFeedbackAdmin")}
          </div>
        ) : (
          filtered.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={typeColor[item.type] || "bg-gray-100"}>
                        {t(`feedback.type${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`)}
                      </Badge>
                      <Badge className={statusColor[item.status] || "bg-gray-100"}>
                        {t(`feedback.status${item.status.replace("_", "").charAt(0).toUpperCase() + item.status.replace("_", "").slice(1)}`)}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.userId ? `User #${item.userId}` : t("feedback.anonymous")}
                      </span>
                    </div>
                    <h4 className="font-semibold mt-2">{item.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{t("feedback.submittedAt")}: {new Date(item.createdAt).toLocaleDateString()}</span>
                      {item.repliedAt && (
                        <span>{t("feedback.repliedAt")}: {new Date(item.repliedAt).toLocaleDateString()}</span>
                      )}
                      {item.contact && <span>Contact: {item.contact}</span>}
                    </div>
                    {item.adminReply && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-md text-sm">
                        <span className="font-medium">{t("feedback.adminReply")}:</span> {item.adminReply}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Select
                      value={item.status}
                      onValueChange={(v) => handleUpdateStatus(item.id, v)}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">{t("feedback.statusOpen")}</SelectItem>
                        <SelectItem value="in_progress">{t("feedback.statusInProgress")}</SelectItem>
                        <SelectItem value="resolved">{t("feedback.statusResolved")}</SelectItem>
                        <SelectItem value="closed">{t("feedback.statusClosed")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelected(item); setReplyText(item.adminReply || ""); }}
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      {t("feedback.reply")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Reply Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("feedback.reply")}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-md text-sm">
                <div className="font-medium">{selected.title}</div>
                <div className="text-muted-foreground mt-1">{selected.content}</div>
              </div>
              <Textarea
                placeholder={t("feedback.replyPlaceholder")}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[120px]"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleReply} disabled={!replyText.trim() || replying}>
                  {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : t("feedback.sendReply")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
