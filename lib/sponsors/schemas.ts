import { z } from 'zod';

// ============================================
// スポンサー企業フォームスキーマ
// ============================================
export const sponsorFormSchema = z.object({
  company_name: z
    .string()
    .min(1, '企業名は必須です')
    .max(100, '企業名は100文字以内で入力してください'),
  contact_name: z.string().optional().or(z.literal('')),
  contact_email: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: '有効なメールアドレスを入力してください',
    }),
  contact_phone: z.string().optional().or(z.literal('')),
  website_url: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || /^https?:\/\/.+/.test(val), {
      message: 'https://で始まるURLを入力してください',
    }),
  company_logo_url: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  is_active: z.boolean().default(true),
});

export type SponsorFormValues = z.infer<typeof sponsorFormSchema>;

export const defaultSponsorFormValues: SponsorFormValues = {
  company_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  website_url: '',
  company_logo_url: '',
  notes: '',
  is_active: true,
};

// ============================================
// 契約フォームスキーマ
// ============================================
export const contractFormSchema = z
  .object({
    sponsor_id: z.string().min(1, 'スポンサーは必須です'),
    plan_type: z.enum(['1day', '7day', '30day', 'custom'], {
      required_error: 'プランタイプを選択してください',
    }),
    start_date: z.string().min(1, '開始日は必須です'),
    end_date: z.string().min(1, '終了日は必須です'),
    price: z.number().min(0, '金額は0以上で入力してください').default(0),
    notes: z.string().optional().or(z.literal('')),
  })
  .refine((data) => new Date(data.end_date) >= new Date(data.start_date), {
    message: '終了日は開始日以降の日付を設定してください',
    path: ['end_date'],
  });

export type ContractFormValues = z.infer<typeof contractFormSchema>;

// ============================================
// 広告枠フォームスキーマ
// ============================================
export const adSlotFormSchema = z.object({
  contract_id: z.string().min(1, '契約は必須です'),
  slot_type: z.enum(['modal', 'cta_button', 'map_icon', 'campaign_banner'], {
    required_error: '枠タイプを選択してください',
  }),
  display_priority: z.number().int().min(1, '優先度は1以上で入力してください').max(100).default(10),
  schedule_config: z
    .object({
      weekdays: z.array(z.number().min(0).max(6)).optional(),
      start_hour: z.number().min(0).max(23).optional(),
      end_hour: z.number().min(0).max(23).optional(),
    })
    .default({}),
  is_enabled: z.boolean().default(true),
});

export type AdSlotFormValues = z.infer<typeof adSlotFormSchema>;

// ============================================
// クリエイティブフォームスキーマ
// ============================================
export const creativeFormSchema = z.object({
  ad_slot_id: z.string().min(1, '広告枠は必須です'),
  title: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  image_url: z.string().optional().or(z.literal('')),
  background_image_url: z.string().optional().or(z.literal('')),
  cta_text: z.string().optional().or(z.literal('')),
  cta_url: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || /^https?:\/\/.+/.test(val), {
      message: 'https://で始まるURLを入力してください',
    }),
  cta_color: z.string().default('#C9A86C'),
  icon_url: z.string().optional().or(z.literal('')),
  icon_position: z
    .object({
      top: z.string().default('120px'),
      left: z.string().default('16px'),
    })
    .default({ top: '120px', left: '16px' }),
  icon_size: z.number().min(20).max(120).default(48),
  display_config: z
    .object({
      show_close_button: z.boolean().default(true),
      auto_close_seconds: z.number().nullable().default(null),
      animation: z.enum(['slideUp', 'fadeIn', 'scaleUp']).default('slideUp'),
      frequency_cap_per_session: z.number().min(1).default(3),
    })
    .default({
      show_close_button: true,
      auto_close_seconds: null,
      animation: 'slideUp',
      frequency_cap_per_session: 3,
    }),
  translations: z
    .object({
      en: z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
          cta_text: z.string().optional(),
        })
        .optional(),
      ko: z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
          cta_text: z.string().optional(),
        })
        .optional(),
      zh: z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
          cta_text: z.string().optional(),
        })
        .optional(),
    })
    .default({}),
  is_active: z.boolean().default(true),
});

export type CreativeFormValues = z.infer<typeof creativeFormSchema>;
