'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { ArrowLeft, Shield, Download, Trash2, FileText, Lock, Eye, Database, AlertTriangle } from 'lucide-react';

interface DataCompliancePageProps {
  onBack?: () => void;
}

export default function DataCompliancePage({ onBack }: DataCompliancePageProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'privacy' | 'export' | 'delete'>('privacy');
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('datainsight_token');
      const res = await fetch('/api/data-compliance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE_ALL_MY_DATA') return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('datainsight_token');
      const res = await fetch('/api/data-compliance', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirm: 'DELETE_ALL_MY_DATA' })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('datainsight_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/';
      } else {
        alert(data.error || 'Deletion failed');
      }
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  const tabs = [
    { key: 'privacy' as const, label: t('compliance.privacyPolicy'), icon: Shield },
    { key: 'export' as const, label: t('compliance.exportData'), icon: Download },
    { key: 'delete' as const, label: t('compliance.deleteData'), icon: Trash2 },
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t('compliance.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('compliance.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'privacy' && (
        <div className="max-w-3xl space-y-6 text-sm text-foreground/80 leading-relaxed">
          {/* Privacy Overview Card */}
          <div className="bg-muted/30 border border-border rounded-lg p-5">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-semibold text-foreground mb-2">{t('compliance.privacyTitle')}</h3>
                <p>{t('compliance.privacyIntro')}</p>
              </div>
            </div>
          </div>

          {/* Data Collection */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-foreground mb-3">{t('compliance.dataCollection')}</h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span>{t('compliance.collectAccount')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span>{t('compliance.collectUsage')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span>{t('compliance.collectDevice')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Data Not Collected */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-foreground mb-3">{t('compliance.dataNotCollect')}</h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0 mt-1.5" />
                    <span>{t('compliance.noBusinessData')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0 mt-1.5" />
                    <span>{t('compliance.noRawDeviceId')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0 mt-1.5" />
                    <span>{t('compliance.noFullPhone')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Data Retention */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h4 className="font-medium text-foreground mb-2">{t('compliance.dataRetention')}</h4>
            <p>{t('compliance.retention90')}</p>
          </div>

          {/* Your Rights */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-foreground mb-3">{t('compliance.yourRights')}</h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span>{t('compliance.rightAccess')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span>{t('compliance.rightExport')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span>{t('compliance.rightDelete')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span>{t('compliance.rightOptOut')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-foreground mb-2">{t('compliance.security')}</h4>
                <p>{t('compliance.securityDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="max-w-2xl space-y-5">
          <div>
            <h3 className="text-base font-semibold text-foreground mb-1">{t('compliance.exportTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('compliance.exportDesc')}</p>
          </div>

          <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-foreground">{t('compliance.exportIncludes')}</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Download className="w-3.5 h-3.5" />
                {t('compliance.exportProfile')}
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Download className="w-3.5 h-3.5" />
                {t('compliance.exportLogin')}
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Download className="w-3.5 h-3.5" />
                {t('compliance.exportActivity')}
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Download className="w-3.5 h-3.5" />
                {t('compliance.exportAiUsage')}
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Download className="w-3.5 h-3.5" />
                {t('compliance.exportSubscription')}
              </li>
            </ul>
          </div>

          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning">{t('compliance.exportNotice')}</p>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-2.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? t('compliance.exporting') : t('compliance.downloadData')}
          </button>
        </div>
      )}

      {activeTab === 'delete' && (
        <div className="max-w-2xl space-y-5">
          <div>
            <h3 className="text-base font-semibold text-foreground mb-1">{t('compliance.deleteTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('compliance.deleteDesc')}</p>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <h4 className="text-sm font-medium text-destructive">{t('compliance.deleteWarning')}</h4>
            </div>
            <ul className="space-y-2 ml-6">
              <li className="flex items-start gap-2 text-xs text-destructive/80">
                <span className="w-1 h-1 rounded-full bg-destructive shrink-0 mt-1.5" />
                {t('compliance.deleteAccount')}
              </li>
              <li className="flex items-start gap-2 text-xs text-destructive/80">
                <span className="w-1 h-1 rounded-full bg-destructive shrink-0 mt-1.5" />
                {t('compliance.deleteLogs')}
              </li>
              <li className="flex items-start gap-2 text-xs text-destructive/80">
                <span className="w-1 h-1 rounded-full bg-destructive shrink-0 mt-1.5" />
                {t('compliance.deleteSub')}
              </li>
              <li className="flex items-start gap-2 text-xs text-destructive/80">
                <span className="w-1 h-1 rounded-full bg-destructive shrink-0 mt-1.5" />
                {t('compliance.deleteIrreversible')}
              </li>
            </ul>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-2">
              {t('compliance.typeConfirm')} <code className="bg-muted px-1.5 py-0.5 rounded text-foreground text-xs font-mono">DELETE_ALL_MY_DATA</code>
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirm(e.target.value)}
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="DELETE_ALL_MY_DATA"
            />
          </div>

          <button
            onClick={handleDelete}
            disabled={deleting || deleteConfirm !== 'DELETE_ALL_MY_DATA'}
            className="w-full py-2.5 text-sm bg-destructive text-white rounded-md hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? t('compliance.deleting') : t('compliance.permanentlyDelete')}
          </button>
        </div>
      )}
    </div>
  );
}
