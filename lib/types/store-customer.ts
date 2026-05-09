export type ProfileAttrs = {
  address?: string;
  age?: string;
  occupation?: string;
  gender?: string;
};

export type StoreCustomerRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  line_linked: boolean;
  visit_count: number;
  first_visit_at: string;
  last_visit_at: string;
  visit_count_30d: number;
  visits_per_week: number;
  attributes: ProfileAttrs;
  memo: StoreCustomerMemo | null;
};

export type StoreCustomerMemo = {
  id: string;
  store_id: string;
  user_id: string;
  order_notes: string | null;
  preference_notes: string | null;
  conversation_notes: string | null;
  updated_at: string;
  updated_by: string | null;
};
