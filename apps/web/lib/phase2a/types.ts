export type PricingMode = 'AREA' | 'FIXED' | 'MANUAL';
export type Availability = 'AVAILABLE' | 'OUT_OF_STOCK' | 'INQUIRY_ONLY';
export type StaffRole = 'OWNER' | 'ADMIN' | 'MANAGER';
export type Category = {
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
};
export type Material = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  article: string;
  description: string | null;
  color_name: string | null;
  normalized_color: string | null;
  material_type: string | null;
  price_per_m2_kopecks: number | null;
  fixed_price_kopecks: number | null;
  minimum_price_kopecks: number | null;
  pricing_mode: PricingMode;
  availability: Availability;
  primary_image_path: string | null;
  categories?: { name: string; slug: string } | null;
};
export type PublicMaterial = {
  name: string;
  slug: string;
  article: string;
  description: string | null;
  color_name: string | null;
  material_type: string | null;
  primary_image_path: string | null;
  category_name: string;
  category_slug: string;
  availability_label: string;
  display_price_kopecks: number | null;
  display_price_suffix: string | null;
};
export type CartItem = {
  materialSlug: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  aiVisualizationPublicReference?: string;
};
export type PricedItem = CartItem & {
  name: string;
  article: string;
  pricingStatus: 'KNOWN' | 'MANUAL';
  unitPriceKopecks: number | null;
  totalPriceKopecks: number | null;
};
export type SiteSettings = {
  site_name: string;
  logo_path: string | null;
  partner_badge_path: string | null;
  whatsapp_phone: string;
  phone: string;
  region: string;
  lead_time_text: string;
  warranty_text: string;
  free_measurement: boolean;
  free_delivery: boolean;
  free_installation: boolean;
  installment_text: string;
  social_links: Record<string, string>;
};

export type PortfolioItem = {
  title: string;
  description: string | null;
  cover_image_path: string;
  imageUrl: string | null;
};
