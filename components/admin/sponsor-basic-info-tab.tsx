'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2, Globe, Mail, Phone, User, Building2, FileText } from 'lucide-react';
import { useAdminTheme } from '@/lib/admin-theme-context';
import { toast } from 'sonner';
import { updateSponsor } from '@/lib/actions/sponsor';
import { sponsorFormSchema, type SponsorFormValues } from '@/lib/sponsors/schemas';
import type { Sponsor } from '@/lib/sponsors/types';

interface Props {
  sponsor: Sponsor;
  onUpdate: (updated: Sponsor) => void;
}

export function SponsorBasicInfoTab({ sponsor, onUpdate }: Props) {
  const { colors: C } = useAdminTheme();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SponsorFormValues>({
    company_name: sponsor.company_name,
    contact_name: sponsor.contact_name || '',
    contact_email: sponsor.contact_email || '',
    contact_phone: sponsor.contact_phone || '',
    website_url: sponsor.website_url || '',
    company_logo_url: sponsor.company_logo_url || '',
    notes: sponsor.notes || '',
    is_active: sponsor.is_active,
  });

  const handleSave = async () => {
    const validation = sponsorFormSchema.safeParse(form);
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || '入力値を確認してください');
      return;
    }
    setSaving(true);
    const res = await updateSponsor(sponsor.id, form);
    setSaving(false);
    if (res.success && res.data) {
      toast.success('スポンサー情報を更新しました');
      onUpdate(res.data);
    } else {
      toast.error(res.error || '更新に失敗しました');
    }
  };

  const inputStyle = {
    background: C.bgInput,
    border: `1px solid ${C.border}`,
    color: C.text,
  };

  const Field = ({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: C.textMuted }}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="企業名" icon={Building2}>
          <input
            type="text"
            value={form.company_name}
            onChange={(e) => setForm((v) => ({ ...v, company_name: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-[#C9A86C]/30"
            style={inputStyle}
          />
        </Field>
        <Field label="担当者名" icon={User}>
          <input
            type="text"
            value={form.contact_name}
            onChange={(e) => setForm((v) => ({ ...v, contact_name: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-[#C9A86C]/30"
            style={inputStyle}
          />
        </Field>
        <Field label="メールアドレス" icon={Mail}>
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) => setForm((v) => ({ ...v, contact_email: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-[#C9A86C]/30"
            style={inputStyle}
          />
        </Field>
        <Field label="電話番号" icon={Phone}>
          <input
            type="text"
            value={form.contact_phone}
            onChange={(e) => setForm((v) => ({ ...v, contact_phone: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-[#C9A86C]/30"
            style={inputStyle}
          />
        </Field>
        <Field label="WebサイトURL" icon={Globe}>
          <input
            type="url"
            value={form.website_url}
            onChange={(e) => setForm((v) => ({ ...v, website_url: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-[#C9A86C]/30"
            style={inputStyle}
            placeholder="https://example.com"
          />
        </Field>
        <div className="flex items-end">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: C.textMuted }}>
              ステータス
            </label>
            <button
              type="button"
              onClick={() => setForm((v) => ({ ...v, is_active: !v.is_active }))}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: form.is_active ? C.successBg : C.dangerBg,
                color: form.is_active ? C.success : C.danger,
                border: `1px solid ${form.is_active ? C.success : C.danger}`,
              }}
            >
              {form.is_active ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>
      </div>

      <Field label="備考" icon={FileText}>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors resize-none focus:ring-2 focus:ring-[#C9A86C]/30"
          style={inputStyle}
          rows={4}
        />
      </Field>

      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ background: C.accent, color: C.accentForeground }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          保存
        </motion.button>
      </div>
    </div>
  );
}
