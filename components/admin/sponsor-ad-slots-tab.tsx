'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, Trash2, Layers, Image, Upload, Edit2, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useAdminTheme } from '@/lib/admin-theme-context';
import { CustomModal } from '@/components/ui/custom-modal';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { SLOT_TYPE_LABELS, PLAN_LABELS } from '@/lib/sponsors/types';
import type { SponsorContract, SponsorAdSlot, SponsorAdCreative, SlotType, PlanType, DisplayConfig } from '@/lib/sponsors/types';

interface Props {
  sponsorId: string;
}

interface SlotWithCreatives extends SponsorAdSlot {
  creatives: SponsorAdCreative[];
}

interface ContractWithSlots extends SponsorContract {
  slots: SlotWithCreatives[];
}

const IMAGE_SIZE_GUIDE: Record<SlotType, { label: string; hint: string }> = {
  modal: { label: '広告画像', hint: '推奨: 1080×1080px（正方形）' },
  cta_button: { label: 'ボタンアイコン', hint: '推奨: 96×96px（正方形）' },
  map_icon: { label: 'マップアイコン', hint: '推奨: 96×96px（正方形）' },
  campaign_banner: { label: 'バナー画像', hint: '推奨: 1200×400px（横長 3:1）' },
};

const CTA_TEXT_MAX_LENGTH = 15;
const ANIMATION_OPTIONS = [
  { value: 'slideUp', label: 'スライドアップ' },
  { value: 'fadeIn', label: 'フェードイン' },
  { value: 'scaleUp', label: 'スケールアップ' },
] as const;

interface CreativeFormState {
  imageUrl: string;
  ctaUrl: string;
  ctaText: string;
  ctaColor: string;
  ctaTextColor: string;
  // Modal-specific display config
  showCloseButton: boolean;
  autoCloseSeconds: string; // empty string = null
  animation: 'slideUp' | 'fadeIn' | 'scaleUp';
  frequencyCapPerSession: number;
  // Map icon specific
  iconPositionTop: string;
  iconPositionLeft: string;
  iconSize: number;
}

const defaultFormState: CreativeFormState = {
  imageUrl: '',
  ctaUrl: '',
  ctaText: '',
  ctaColor: '#C9A86C',
  ctaTextColor: '#FFFFFF',
  showCloseButton: true,
  autoCloseSeconds: '',
  animation: 'slideUp',
  frequencyCapPerSession: 3,
  iconPositionTop: '120',
  iconPositionLeft: '16',
  iconSize: 48,
};

function formStateFromCreative(creative: SponsorAdCreative, slotType: SlotType): CreativeFormState {
  const dc = (creative.display_config as unknown as DisplayConfig & { cta_text_color?: string }) || {};
  const iconPos = (creative.icon_position || { top: '120px', left: '16px' }) as { top: string; left: string };
  return {
    imageUrl: slotType === 'campaign_banner'
      ? (creative.image_url || '')
      : slotType === 'modal'
        ? (creative.background_image_url || '')
        : slotType === 'map_icon'
          ? (creative.icon_url || '')
          : '',
    ctaUrl: creative.cta_url || '',
    ctaText: creative.cta_text || '',
    ctaColor: creative.cta_color || '#C9A86C',
    ctaTextColor: dc.cta_text_color || '#FFFFFF',
    showCloseButton: dc.show_close_button ?? true,
    autoCloseSeconds: dc.auto_close_seconds != null ? String(dc.auto_close_seconds) : '',
    animation: dc.animation || 'slideUp',
    frequencyCapPerSession: dc.frequency_cap_per_session ?? 3,
    iconPositionTop: parseInt(iconPos.top) ? String(parseInt(iconPos.top)) : '120',
    iconPositionLeft: parseInt(iconPos.left) ? String(parseInt(iconPos.left)) : '16',
    iconSize: creative.icon_size || 48,
  };
}

export function SponsorAdSlotsTab({ sponsorId }: Props) {
  const { colors: C } = useAdminTheme();
  const [data, setData] = useState<ContractWithSlots[]>([]);
  const [loading, setLoading] = useState(true);

  // Slot form
  const [slotFormOpen, setSlotFormOpen] = useState(false);
  const [slotContractId, setSlotContractId] = useState('');
  const [slotType, setSlotType] = useState<SlotType>('modal');
  const [slotPriority, setSlotPriority] = useState(10);
  const [saving, setSaving] = useState(false);

  // Creative form
  const [creativeFormOpen, setCreativeFormOpen] = useState(false);
  const [creativeSlotId, setCreativeSlotId] = useState('');
  const [creativeSlotType, setCreativeSlotType] = useState<SlotType>('modal');
  const [editingCreativeId, setEditingCreativeId] = useState<string | null>(null);
  const [form, setForm] = useState<CreativeFormState>(defaultFormState);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchData(); }, [sponsorId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: contracts, error: cErr } = await supabase
      .from('sponsor_contracts')
      .select('*')
      .eq('sponsor_id', sponsorId)
      .order('created_at', { ascending: false });
    if (cErr || !contracts) { setLoading(false); return; }

    const contractsWithSlots: ContractWithSlots[] = [];
    for (const contract of contracts) {
      const { data: slotsData } = await supabase
        .from('sponsor_ad_slots')
        .select('*')
        .eq('contract_id', contract.id)
        .order('display_priority', { ascending: false });
      const slots: SlotWithCreatives[] = [];
      if (slotsData) {
        for (const slot of slotsData) {
          const { data: creativesData } = await supabase
            .from('sponsor_ad_creatives')
            .select('*')
            .eq('ad_slot_id', slot.id)
            .order('created_at', { ascending: false });
          slots.push({ ...slot as SponsorAdSlot, creatives: (creativesData || []) as SponsorAdCreative[] });
        }
      }
      contractsWithSlots.push({ ...contract as SponsorContract, slots });
    }
    setData(contractsWithSlots);
    setLoading(false);
  };

  const handleCreateSlot = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('sponsor_ad_slots')
      .insert({
        contract_id: slotContractId,
        slot_type: slotType,
        display_priority: slotPriority,
        schedule_config: {},
        is_enabled: true,
      });
    setSaving(false);
    if (!error) {
      toast.success('広告枠を作成しました');
      setSlotFormOpen(false);
      fetchData();
    } else {
      toast.error(error.message || '作成に失敗しました');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    const { error } = await supabase
      .from('sponsor_ad_slots')
      .delete()
      .eq('id', slotId);
    if (!error) {
      toast.success('広告枠を削除しました');
      fetchData();
    } else {
      toast.error(error.message || '削除に失敗しました');
    }
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      toast.error('画像は10MB以下にしてください');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `sponsor-ads/${crypto.randomUUID()}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from('store-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('store-images')
        .getPublicUrl(fileName);

      setForm(prev => ({ ...prev, imageUrl: publicUrl }));
      toast.success('画像をアップロードしました');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('画像のアップロードに失敗しました');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageDelete = async () => {
    if (!form.imageUrl) return;
    setUploadingImage(true);
    try {
      const url = new URL(form.imageUrl);
      const pathParts = url.pathname.split('/store-images/');
      if (pathParts.length >= 2) {
        await supabase.storage.from('store-images').remove([pathParts[1]]);
      }
      setForm(prev => ({ ...prev, imageUrl: '' }));
      toast.success('画像を削除しました');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('画像の削除に失敗しました');
    } finally {
      setUploadingImage(false);
    }
  };

  const openCreativeForm = (slotId: string, slotType: SlotType, creative?: SponsorAdCreative) => {
    setCreativeSlotId(slotId);
    setCreativeSlotType(slotType);
    if (creative) {
      setEditingCreativeId(creative.id);
      setForm(formStateFromCreative(creative, slotType));
    } else {
      setEditingCreativeId(null);
      setForm(defaultFormState);
    }
    setCreativeFormOpen(true);
  };

  const buildCreativePayload = () => {
    const st = creativeSlotType;
    return {
      ad_slot_id: creativeSlotId,
      cta_text: form.ctaText || null,
      cta_url: form.ctaUrl || null,
      cta_color: form.ctaColor,
      image_url: st === 'campaign_banner' ? (form.imageUrl || null) : null,
      background_image_url: st === 'modal' ? (form.imageUrl || null) : null,
      icon_url: st === 'map_icon' ? (form.imageUrl || null) : null,
      icon_position: { top: `${form.iconPositionTop}px`, left: `${form.iconPositionLeft}px` },
      icon_size: form.iconSize,
      display_config: {
        show_close_button: form.showCloseButton,
        auto_close_seconds: form.autoCloseSeconds ? Number(form.autoCloseSeconds) : null,
        animation: form.animation,
        frequency_cap_per_session: form.frequencyCapPerSession,
        cta_text_color: form.ctaTextColor,
      },
      translations: {},
      is_active: true,
    };
  };

  const handleSaveCreative = async () => {
    const needsImage = creativeSlotType !== 'cta_button';
    if (needsImage && !form.imageUrl) {
      toast.error('画像をアップロードしてください');
      return;
    }
    if (creativeSlotType === 'cta_button' && !form.ctaText) {
      toast.error('CTAテキストを入力してください');
      return;
    }

    setSaving(true);
    const payload = buildCreativePayload();

    if (editingCreativeId) {
      // Update existing - fetch current version first for increment
      const { data: current } = await supabase
        .from('sponsor_ad_creatives')
        .select('version')
        .eq('id', editingCreativeId)
        .single();

      const nextVersion = ((current?.version as number) || 1) + 1;
      const { error } = await supabase
        .from('sponsor_ad_creatives')
        .update({ ...payload, version: nextVersion })
        .eq('id', editingCreativeId);

      setSaving(false);
      if (!error) {
        toast.success('クリエイティブを更新しました');
        setCreativeFormOpen(false);
        fetchData();
      } else {
        toast.error(error.message || '更新に失敗しました');
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('sponsor_ad_creatives')
        .insert(payload);
      setSaving(false);
      if (!error) {
        toast.success('クリエイティブを作成しました');
        setCreativeFormOpen(false);
        fetchData();
      } else {
        toast.error(error.message || '作成に失敗しました');
      }
    }
  };

  const handleDeleteCreative = async (creativeId: string) => {
    const { error } = await supabase
      .from('sponsor_ad_creatives')
      .delete()
      .eq('id', creativeId);
    if (!error) {
      toast.success('クリエイティブを削除しました');
      fetchData();
    } else {
      toast.error(error.message || '削除に失敗しました');
    }
  };

  const handleToggleCreativeActive = async (creative: SponsorAdCreative) => {
    const { error } = await supabase
      .from('sponsor_ad_creatives')
      .update({ is_active: !creative.is_active })
      .eq('id', creative.id);
    if (!error) {
      toast.success(creative.is_active ? '無効にしました' : '有効にしました');
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: C.accent }} />
      </div>
    );
  }

  const guide = IMAGE_SIZE_GUIDE[creativeSlotType];
  const isEditing = !!editingCreativeId;

  return (
    <div className="space-y-6">
      {data.length === 0 ? (
        <div className="text-center py-12">
          <Layers className="w-10 h-10 mx-auto mb-2" style={{ color: C.textSubtle }} />
          <p className="text-sm" style={{ color: C.textMuted }}>契約がありません。まず契約を作成してください。</p>
        </div>
      ) : (
        data.map((contract) => (
          <div key={contract.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            {/* Contract header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ background: C.bgElevated, borderBottom: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold" style={{ color: C.text }}>
                  {PLAN_LABELS[contract.plan_type as PlanType]}
                </span>
                <span className="text-xs" style={{ color: C.textSubtle }}>
                  {contract.start_date} ~ {contract.end_date}
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setSlotContractId(contract.id); setSlotFormOpen(true); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white"
                style={{ background: C.accent }}
              >
                <Plus className="w-3 h-3" />
                枠追加
              </motion.button>
            </div>

            {/* Slots */}
            {contract.slots.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="text-xs" style={{ color: C.textSubtle }}>広告枠がありません</p>
              </div>
            ) : (
              contract.slots.map((slot) => (
                <div key={slot.id} style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
                  <div className="flex items-center justify-between px-5 py-3" style={{ background: C.bgCard }}>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: C.accentBg, color: C.accent }}>
                        {SLOT_TYPE_LABELS[slot.slot_type as SlotType]}
                      </span>
                      <span className="text-xs" style={{ color: C.textSubtle }}>
                        優先度: {slot.display_priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => openCreativeForm(slot.id, slot.slot_type as SlotType)}
                        className="p-1.5 rounded-lg"
                        style={{ color: C.accent }}
                        title="クリエイティブ追加"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="p-1.5 rounded-lg"
                        style={{ color: C.danger }}
                        title="枠削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Creatives list */}
                  {slot.creatives.length > 0 && (
                    <div className="px-5 py-2 space-y-2" style={{ background: C.bgCard }}>
                      {slot.creatives.map((creative) => {
                        const displayImage = creative.image_url || creative.icon_url || creative.background_image_url;
                        return (
                          <div
                            key={creative.id}
                            className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ background: C.bgInput, border: `1px solid ${C.borderSubtle}` }}
                            onClick={() => openCreativeForm(slot.id, slot.slot_type as SlotType, creative)}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {displayImage ? (
                                <div className="w-10 h-10 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                                  <img src={displayImage} alt="" className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.bgElevated }}>
                                  <Image className="w-4 h-4" style={{ color: C.textSubtle }} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate" style={{ color: C.text }}>
                                    {SLOT_TYPE_LABELS[slot.slot_type as SlotType]}
                                  </p>
                                  {/* Version badge */}
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: C.accentBg, color: C.accent }}>
                                    v{creative.version || 1}
                                  </span>
                                  {/* Active/Inactive badge */}
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 cursor-pointer ${
                                      creative.is_active
                                        ? 'bg-success/10 text-success'
                                        : 'bg-muted text-muted-foreground'
                                    }`}
                                    onClick={(e) => { e.stopPropagation(); handleToggleCreativeActive(creative); }}
                                    title={creative.is_active ? 'クリックで無効化' : 'クリックで有効化'}
                                  >
                                    {creative.is_active ? '有効' : '無効'}
                                  </span>
                                </div>
                                {creative.cta_url && (
                                  <p className="text-xs truncate" style={{ color: C.textSubtle }}>{creative.cta_url}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Edit2 className="w-3.5 h-3.5" style={{ color: C.textSubtle }} />
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); handleDeleteCreative(creative.id); }}
                                className="p-1.5 rounded-lg"
                                style={{ color: C.danger }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </motion.button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ))
      )}

      {/* Slot Create Modal */}
      <CustomModal isOpen={slotFormOpen} onClose={() => setSlotFormOpen(false)} title="広告枠追加">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">枠タイプ</label>
            <select
              value={slotType}
              onChange={(e) => setSlotType(e.target.value as SlotType)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500"
            >
              {(Object.keys(SLOT_TYPE_LABELS) as SlotType[]).map((k) => (
                <option key={k} value={k}>{SLOT_TYPE_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">優先度 (1-100)</label>
            <input
              type="text"
              inputMode="numeric"
              value={slotPriority}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '');
                setSlotPriority(v === '' ? 1 : Math.min(100, Number(v)));
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setSlotFormOpen(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
              キャンセル
            </button>
            <button onClick={handleCreateSlot} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 bg-brass-500">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '作成'}
            </button>
          </div>
        </div>
      </CustomModal>

      {/* Creative Create/Edit Modal */}
      <CustomModal
        isOpen={creativeFormOpen}
        onClose={() => setCreativeFormOpen(false)}
        title={`${isEditing ? 'クリエイティブ編集' : 'クリエイティブ追加'}（${SLOT_TYPE_LABELS[creativeSlotType]}）`}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          {/* Image upload (not for cta_button) */}
          {creativeSlotType !== 'cta_button' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{guide.label}</label>
              <p className="text-xs text-gray-400 mb-2">{guide.hint}</p>

              {form.imageUrl ? (
                <div className="relative">
                  <div
                    className="rounded-xl overflow-hidden border border-gray-200"
                    style={{
                      aspectRatio: creativeSlotType === 'campaign_banner' ? '3/1' : '1/1',
                      maxHeight: creativeSlotType === 'campaign_banner' ? '160px' : '240px',
                    }}
                  >
                    <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <button
                    onClick={handleImageDelete}
                    disabled={uploadingImage}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="creative-image-upload"
                  className="flex flex-col items-center justify-center cursor-pointer transition-all duration-200 rounded-xl"
                  style={{
                    aspectRatio: creativeSlotType === 'campaign_banner' ? '3/1' : '1/1',
                    maxHeight: creativeSlotType === 'campaign_banner' ? '160px' : '240px',
                    backgroundColor: 'rgba(201, 168, 108, 0.05)',
                    border: '2px dashed rgba(201, 168, 108, 0.3)',
                  }}
                >
                  {uploadingImage ? (
                    <Loader2 className="w-8 h-8 animate-spin text-brass-500" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mb-2 text-brass-500" />
                      <span className="text-xs font-bold text-gray-400">画像をアップロード</span>
                      <span className="text-xs text-gray-300 mt-1">JPEG, PNG, WebP（10MB以下）</span>
                    </>
                  )}
                </label>
              )}
              <input
                ref={fileInputRef}
                id="creative-image-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
              />
            </div>
          )}

          {/* CTA settings (all types) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">遷移先URL</label>
            <input
              type="url"
              value={form.ctaUrl}
              onChange={(e) => setForm(prev => ({ ...prev, ctaUrl: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500"
              placeholder="https://..."
            />
          </div>

          {/* CTA Button text & colors */}
          {(creativeSlotType === 'cta_button' || creativeSlotType === 'modal') && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  CTAテキスト {creativeSlotType === 'cta_button' && <span className="text-destructive">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.ctaText}
                    onChange={(e) => {
                      if (e.target.value.length <= CTA_TEXT_MAX_LENGTH) {
                        setForm(prev => ({ ...prev, ctaText: e.target.value }));
                      }
                    }}
                    maxLength={CTA_TEXT_MAX_LENGTH}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500"
                    placeholder="詳しくはこちら"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    {form.ctaText.length}/{CTA_TEXT_MAX_LENGTH}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">ボタン背景色</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.ctaColor} onChange={(e) => setForm(prev => ({ ...prev, ctaColor: e.target.value }))} className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer" />
                    <input type="text" value={form.ctaColor} onChange={(e) => setForm(prev => ({ ...prev, ctaColor: e.target.value }))} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">テキスト色</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.ctaTextColor} onChange={(e) => setForm(prev => ({ ...prev, ctaTextColor: e.target.value }))} className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer" />
                    <input type="text" value={form.ctaTextColor} onChange={(e) => setForm(prev => ({ ...prev, ctaTextColor: e.target.value }))} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Modal-specific: display config */}
          {creativeSlotType === 'modal' && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">表示設定</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">アニメーション</label>
                  <select
                    value={form.animation}
                    onChange={(e) => setForm(prev => ({ ...prev, animation: e.target.value as CreativeFormState['animation'] }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500"
                  >
                    {ANIMATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">表示回数上限/セッション</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.frequencyCapPerSession}
                    onChange={(e) => setForm(prev => ({ ...prev, frequencyCapPerSession: Math.max(1, Math.min(10, Number(e.target.value))) }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">自動閉じ（秒）</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.autoCloseSeconds}
                    onChange={(e) => setForm(prev => ({ ...prev, autoCloseSeconds: e.target.value.replace(/[^0-9]/g, '') }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500"
                    placeholder="空欄=自動閉じなし"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={form.showCloseButton}
                      onChange={(e) => setForm(prev => ({ ...prev, showCloseButton: e.target.checked }))}
                      className="w-4 h-4 rounded border-border accent-brass-500"
                    />
                    <span className="text-xs font-semibold text-gray-600">閉じるボタン表示</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Map icon specific: position & size */}
          {creativeSlotType === 'map_icon' && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">アイコン位置・サイズ</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">上 (px)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.iconPositionTop}
                    onChange={(e) => setForm(prev => ({ ...prev, iconPositionTop: e.target.value.replace(/[^0-9]/g, '') }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">左 (px)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.iconPositionLeft}
                    onChange={(e) => setForm(prev => ({ ...prev, iconPositionLeft: e.target.value.replace(/[^0-9]/g, '') }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">サイズ (px)</label>
                  <input
                    type="number"
                    min={24}
                    max={96}
                    value={form.iconSize}
                    onChange={(e) => setForm(prev => ({ ...prev, iconSize: Math.max(24, Math.min(96, Number(e.target.value))) }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Preview section */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(!previewOpen)}
              className="flex items-center gap-1.5 text-xs font-semibold mb-2"
              style={{ color: C.accent }}
            >
              <Eye className="w-3.5 h-3.5" />
              プレビュー
              {previewOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <AnimatePresence>
              {previewOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl p-4 bg-brewer-950" style={{ border: '1px solid rgba(201,168,108,0.2)' }}>
                    <p className="text-[10px] text-gray-500 mb-2 text-center">実際の表示イメージ</p>
                    <CreativePreview form={form} slotType={creativeSlotType} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setCreativeFormOpen(false)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleSaveCreative}
              disabled={saving || uploadingImage}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 bg-brass-500"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isEditing ? '更新' : '作成'}
            </button>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}

// ============================================
// Preview Component
// ============================================
function CreativePreview({ form, slotType }: { form: CreativeFormState; slotType: SlotType }) {
  if (slotType === 'modal') {
    return (
      <div className="relative rounded-xl overflow-hidden max-w-[280px] mx-auto" style={{ minHeight: 200 }}>
        {form.imageUrl ? (
          <img src={form.imageUrl} alt="" className="w-full h-full object-cover absolute inset-0" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-brewer-800 to-brewer-950" />
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 p-5 flex flex-col items-center justify-center" style={{ minHeight: 200 }}>
          <span className="absolute top-2 left-2 text-[8px] text-white/50 bg-white/10 px-1 rounded">広告</span>
          {form.showCloseButton && (
            <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px]">×</span>
          )}
          {form.ctaText && (
            <span className="px-4 py-2 rounded-full text-xs font-bold" style={{ backgroundColor: form.ctaColor, color: form.ctaTextColor }}>
              {form.ctaText}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (slotType === 'cta_button') {
    return (
      <div className="flex justify-center py-3">
        <div className="relative">
          <span className="absolute -top-2 -left-1 text-[8px] font-medium bg-white/90 text-gray-600 px-1 py-0.5 rounded-full">PR</span>
          <span className="px-5 py-3 rounded-full text-sm font-bold shadow-lg inline-flex items-center gap-2" style={{ backgroundColor: form.ctaColor, color: form.ctaTextColor }}>
            {form.imageUrl && <img src={form.imageUrl} alt="" className="w-5 h-5 rounded-full object-cover" />}
            {form.ctaText || 'ボタンテキスト'}
          </span>
        </div>
      </div>
    );
  }

  if (slotType === 'map_icon') {
    return (
      <div className="relative bg-brewer-800 rounded-lg" style={{ height: 160 }}>
        <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-gray-500">マップ領域</p>
        <div
          className="absolute"
          style={{ top: `${Math.min(parseInt(form.iconPositionTop) || 16, 120)}px`, left: `${Math.min(parseInt(form.iconPositionLeft) || 16, 200)}px` }}
        >
          {form.imageUrl ? (
            <img src={form.imageUrl} alt="" className="rounded-lg object-cover shadow-md" style={{ width: form.iconSize, height: form.iconSize }} />
          ) : (
            <div className="rounded-lg bg-gray-600 flex items-center justify-center" style={{ width: form.iconSize, height: form.iconSize }}>
              <Image className="w-4 h-4 text-gray-400" />
            </div>
          )}
          <span className="absolute -top-1 -right-1 text-[7px] bg-warning text-warning-foreground px-1 rounded">AD</span>
        </div>
      </div>
    );
  }

  if (slotType === 'campaign_banner') {
    return (
      <div className="relative w-full rounded-xl overflow-hidden" style={{ minHeight: 70 }}>
        {form.imageUrl ? (
          <img src={form.imageUrl} alt="" className="w-full h-full object-cover absolute inset-0" style={{ aspectRatio: '3/1' }} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-brewer-800 to-brewer-950" />
        )}
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 p-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <span className="inline-block text-[8px] font-medium bg-white/20 text-white/80 px-1 py-0.5 rounded-full mb-0.5">PR</span>
          </div>
          {form.ctaUrl && (
            <div className="ml-2 w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: form.ctaColor }}>
              <span className="text-white text-[10px]">&gt;</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
