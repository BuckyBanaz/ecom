export type Brand = {
  id: string;
  name: string;
  logo?: string;
};

export type Series = {
  id: string;
  name: string;
  brandId: string;
  logo?: string;
};

export const brands: Brand[] = [
  { id: "b-1", name: "Lumio", logo: "/assets/brand-lumio.png" },
  { id: "b-2", name: "Brilliant", logo: "/assets/brand-brilliant.png" },
  { id: "b-3", name: "Calex", logo: "/assets/brand-calex.png" },
  { id: "b-4", name: "Philips", logo: "/assets/brand-philips.png" },
  { id: "b-5", name: "Eglo", logo: "/assets/brand-eglo.png" },
  { id: "b-6", name: "Steinhauer", logo: "/assets/brand-steinhauer.png" },
];

export const series: Series[] = [
  { id: "s-1", name: "Hue White & Color", brandId: "b-4", logo: "" },
  { id: "s-2", name: "Hue Filament", brandId: "b-4", logo: "" },
  { id: "s-3", name: "Townshend", brandId: "b-5", logo: "" },
  { id: "s-4", name: "Connect Smart", brandId: "b-5", logo: "" },
  { id: "s-5", name: "Retro Filament", brandId: "b-3", logo: "" },
  { id: "s-6", name: "Ligno Collection", brandId: "b-1", logo: "" },
];
