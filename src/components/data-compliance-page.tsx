'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

export default function DataCompliancePage() {
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
    { key: 'privacy' as const, label: t('compliance.privacyPolicy') },
    { key: 'export' as const, label: t('compliance.exportData') },
    { key: 'delete' as const, label: t('compliance.deleteData') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">{t('compliance.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('compliance.subtitle')}</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-6 flex gap-4">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 text-sm border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >{tab.label}</button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'privacy' && (
            <div className="space-y-4 text-sm text-foreground/80 leading-relaxed">
              <h3 className="text-base font-semibold text-foreground">{t('compliance.privacyTitle')}</h3>
              <p>{t('compliance.privacyIntro')}</p>

              <h4 className="font-medium text-foreground mt-4">{t('compliance.dataCollection')}</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('compliance.collectAccount')}</li>
                <li>{t('compliance.collectUsage')}</li>
                <li>{t('compliance.collectDevice')}</li>
              </ul>

              <h4 className="font-medium text-foreground mt-4">{t('compliance.dataNotCollect')}</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('compliance.noBusinessData')}</li>
                <li>{t('compliance.noRawDeviceId')}</li>
                <li>{t('compliance.noFullPhone')}</li>
              </ul>

              <h4 className="font-medium text-foreground mt-4">{t('compliance.dataRetention')}</h4>
              <p>{t('compliance.retention90')}</p>

              <h4 className="font-medium text-foreground mt-4">{t('compliance.yourRights')}</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('compliance.rightAccess')}</li>
                <li>{t('compliance.rightExport')}</li>
                <li>{t('compliance.rightDelete')}</li>
                <li>{t('compliance.rightOptOut')}</li>
              </ul>

              <h4 className="font-medium text-foreground mt-4">{t('compliance.security')}</h4>
              <p>{t('compliance.securityDesc')}</p>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground">{t('compliance.exportTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('compliance.exportDesc')}</p>

              <div className="bg-muted/30 border border-border rounded-md p-4 space-y-2">
                <h4 className="text-sm font-medium text-foreground">{t('compliance.exportIncludes')}</h4>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  <li>{t('compliance.exportProfile')}</li>
                  <li>{t('compliance.exportLogin')}</li>
                  <li>{t('compliance.exportActivity')}</li>
                  <li>{t('compliance.exportAiUsage')}</li>
                  <li>{t('compliance.exportSubscription')}</li>
                </ul>
              </div>

              <div className="bg-warning/10 border border-warning/20 rounded-md p-3">
                <p className="text-xs text-warning">{t('compliance.exportNotice')}</p>
              </div>

              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full py-2.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {exporting ? t('compliance.exporting') : t('compliance.downloadData')}
              </button>
            </div>
          )}

          {activeTab === 'delete' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground">{t('compliance.deleteTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('compliance.deleteDesc')}</p>

              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 space-y-2">
                <h4 className="text-sm font-medium text-destructive">{t('compliance.deleteWarning')}</h4>
                <ul className="text-xs text-destructive/80 space-y-1 list-disc pl-4">
                  <li>{t('compliance.deleteAccount')}</li>
                  <li>{t('compliance.deleteLogs')}</li>
                  <li>{t('compliance.deleteSub')}</li>
                  <li>{t('compliance.deleteIrreversible')}</li>
                </ul>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-2">
                  {t('compliance.typeConfirm')} <code className="bg-muted px-1.5 py-0.5 rounded text-foreground text-xs">DELETE_ALL_MY_DATA</code>
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="DELETE_ALL_MY_DATA"
                />
              </div>

              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirm !== 'DELETE_ALL_MY_DATA'}
                className="w-full py-2.5 text-sm bg-destructive text-white rounded-md hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? t('compliance.deleting') : t('compliance.permanentlyDelete')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
