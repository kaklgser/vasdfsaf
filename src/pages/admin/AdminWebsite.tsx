import { useEffect, useState } from 'react';
import { Power, Save } from 'lucide-react';
import SiteClosedOverlay from '../../components/SiteClosedOverlay';
import { useToast } from '../../components/Toast';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { MISSING_SITE_SETTINGS_MESSAGE, defaultOpenSiteSettings, isMissingSiteSettingsSchemaError, SITE_SETTINGS_MIGRATION_PATH } from '../../lib/siteSettings';
import { supabase } from '../../lib/supabase';
import type { SiteSettings } from '../../types';

interface SiteSettingsForm {
  site_is_open: boolean;
  closure_title: string;
  closure_message: string;
  reopening_text: string;
}

function buildForm(settings: SiteSettings | null): SiteSettingsForm {
  return {
    site_is_open: settings?.site_is_open ?? true,
    closure_title: settings?.closure_title || 'We are currently closed',
    closure_message: settings?.closure_message || 'Ordering is temporarily unavailable right now.',
    reopening_text: settings?.reopening_text || 'We will open at 11:00 AM',
  };
}

export default function AdminWebsite() {
  const { settings, loading, schemaMissing, refreshSettings } = useSiteSettings();
  const { showToast } = useToast();
  const [form, setForm] = useState<SiteSettingsForm>(() => buildForm(null));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(buildForm(settings));
  }, [settings]);

  async function saveSettings() {
    if (schemaMissing) {
      showToast(MISSING_SITE_SETTINGS_MESSAGE, 'error');
      return;
    }

    setSaving(true);

    const payload = {
      id: true,
      site_is_open: form.site_is_open,
      closure_title: form.closure_title.trim() || 'We are currently closed',
      closure_message: form.closure_message.trim() || 'Ordering is temporarily unavailable right now.',
      reopening_text: form.reopening_text.trim() || 'We will open again soon.',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('site_settings').upsert(payload, { onConflict: 'id' });

    if (error) {
      setSaving(false);
      showToast(
        isMissingSiteSettingsSchemaError(error)
          ? MISSING_SITE_SETTINGS_MESSAGE
          : error.message || 'Failed to save website settings',
        'error'
      );
      return;
    }

    await refreshSettings();
    setSaving(false);
    showToast(form.site_is_open ? 'Website is live' : 'Website switched off');
  }

  if (loading && !settings) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-brand-surface rounded w-40 mb-4" />
        <div className="h-56 bg-brand-surface rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Website Status</h1>
        <p className="text-sm text-brand-text-dim mt-1">Turn the customer website on or off and control the closure overlay text.</p>
      </div>

      {schemaMissing && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-300">Website settings table is missing in the current database.</p>
          <p className="text-sm text-amber-200/90 mt-1">
            Apply <span className="font-mono">{SITE_SETTINGS_MIGRATION_PATH}</span> and reload this page.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
        <div className="bg-brand-surface rounded-xl border border-brand-border p-5 space-y-5">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-bg/40 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-brand-text-dim mb-1">Customer Website</p>
              <h2 className="text-lg font-bold text-white">{form.site_is_open ? 'Open' : 'Closed'}</h2>
              <p className="text-sm text-brand-text-muted">
                {form.site_is_open
                  ? 'Customers can browse and place orders.'
                  : 'Customers will see a full-screen closure overlay.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, site_is_open: !current.site_is_open }))}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                form.site_is_open
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
              }`}
            >
              <Power size={16} />
              {form.site_is_open ? 'Turn Off' : 'Turn On'}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Overlay Title</label>
              <input
                value={form.closure_title}
                onChange={(e) => setForm((current) => ({ ...current, closure_title: e.target.value }))}
                className="input-field"
                placeholder="We are currently closed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">Overlay Message</label>
              <textarea
                value={form.closure_message}
                onChange={(e) => setForm((current) => ({ ...current, closure_message: e.target.value }))}
                className="input-field resize-none"
                rows={4}
                placeholder="Ordering is temporarily unavailable right now."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">Opening Note</label>
              <input
                value={form.reopening_text}
                onChange={(e) => setForm((current) => ({ ...current, reopening_text: e.target.value }))}
                className="input-field"
                placeholder="We will open at 11:00 AM"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void saveSettings()}
            disabled={saving || schemaMissing}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
          >
            <Save size={14} />
            {schemaMissing ? 'Migration Required' : saving ? 'Saving...' : 'Save Website Settings'}
          </button>
        </div>

        <div className="bg-brand-surface rounded-xl border border-brand-border p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-brand-text-dim mb-3">Overlay Preview</p>
          <div className="relative min-h-[520px] rounded-2xl overflow-hidden bg-brand-bg border border-brand-border">
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,_rgba(216,178,78,0.18),_transparent_55%)]" />
            <div className="absolute inset-0 p-4">
              <div className="h-12 rounded-xl bg-brand-surface border border-brand-border mb-3" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-36 rounded-xl bg-brand-surface border border-brand-border" />
                <div className="h-36 rounded-xl bg-brand-surface border border-brand-border" />
              </div>
            </div>

            {!form.site_is_open && (
              <SiteClosedOverlay
                contained
                settings={{
                  ...defaultOpenSiteSettings,
                  ...settings,
                  id: true,
                  site_is_open: form.site_is_open,
                  closure_title: form.closure_title.trim() || 'We are currently closed',
                  closure_message: form.closure_message.trim() || 'Ordering is temporarily unavailable right now.',
                  reopening_text: form.reopening_text.trim() || 'We will open again soon.',
                  created_at: settings?.created_at || defaultOpenSiteSettings.created_at,
                  updated_at: settings?.updated_at || defaultOpenSiteSettings.updated_at,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
