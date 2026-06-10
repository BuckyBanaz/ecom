import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faStar } from "@fortawesome/free-solid-svg-icons/faStar";

const iconCache = new Map<string, IconDefinition>([["star", faStar]]);

type IconLoader = () => Promise<IconDefinition>;

const ICON_LOADERS: Record<string, IconLoader> = {
  star: async () => faStar,
  "truck-fast": async () => (await import("@fortawesome/free-solid-svg-icons/faTruckFast")).faTruckFast,
  "rotate-left": async () => (await import("@fortawesome/free-solid-svg-icons/faRotateLeft")).faRotateLeft,
  "arrow-rotate-left": async () => (await import("@fortawesome/free-solid-svg-icons/faArrowRotateLeft")).faArrowRotateLeft,
  shield: async () => (await import("@fortawesome/free-solid-svg-icons/faShield")).faShield,
  "shield-check": async () => (await import("@fortawesome/free-solid-svg-icons/faShieldHalved")).faShieldHalved,
  headset: async () => (await import("@fortawesome/free-solid-svg-icons/faHeadset")).faHeadset,
  truck: async () => (await import("@fortawesome/free-solid-svg-icons/faTruck")).faTruck,
  "credit-card": async () => (await import("@fortawesome/free-solid-svg-icons/faCreditCard")).faCreditCard,
  lock: async () => (await import("@fortawesome/free-solid-svg-icons/faLock")).faLock,
  phone: async () => (await import("@fortawesome/free-solid-svg-icons/faPhone")).faPhone,
  envelope: async () => (await import("@fortawesome/free-solid-svg-icons/faEnvelope")).faEnvelope,
  "location-dot": async () => (await import("@fortawesome/free-solid-svg-icons/faLocationDot")).faLocationDot,
  gift: async () => (await import("@fortawesome/free-solid-svg-icons/faGift")).faGift,
  percent: async () => (await import("@fortawesome/free-solid-svg-icons/faPercent")).faPercent,
  tag: async () => (await import("@fortawesome/free-solid-svg-icons/faTag")).faTag,
  bolt: async () => (await import("@fortawesome/free-solid-svg-icons/faBolt")).faBolt,
  fire: async () => (await import("@fortawesome/free-solid-svg-icons/faFire")).faFire,
  crown: async () => (await import("@fortawesome/free-solid-svg-icons/faCrown")).faCrown,
  check: async () => (await import("@fortawesome/free-solid-svg-icons/faCheck")).faCheck,
  "circle-check": async () => (await import("@fortawesome/free-solid-svg-icons/faCircleCheck")).faCircleCheck,
  facebook: async () => (await import("@fortawesome/free-brands-svg-icons/faFacebook")).faFacebook,
  instagram: async () => (await import("@fortawesome/free-brands-svg-icons/faInstagram")).faInstagram,
  youtube: async () => (await import("@fortawesome/free-brands-svg-icons/faYoutube")).faYoutube,
  twitter: async () => (await import("@fortawesome/free-brands-svg-icons/faTwitter")).faTwitter,
  "x-twitter": async () => (await import("@fortawesome/free-brands-svg-icons/faXTwitter")).faXTwitter,
  linkedin: async () => (await import("@fortawesome/free-brands-svg-icons/faLinkedin")).faLinkedin,
  pinterest: async () => (await import("@fortawesome/free-brands-svg-icons/faPinterest")).faPinterest,
  tiktok: async () => (await import("@fortawesome/free-brands-svg-icons/faTiktok")).faTiktok,
  whatsapp: async () => (await import("@fortawesome/free-brands-svg-icons/faWhatsapp")).faWhatsapp,
  telegram: async () => (await import("@fortawesome/free-brands-svg-icons/faTelegram")).faTelegram,
};

export async function resolveIconAsync(iconName: string): Promise<IconDefinition> {
  const key = iconName?.trim() || "star";
  const cached = iconCache.get(key);
  if (cached) return cached;

  const loader = ICON_LOADERS[key];
  const loaded = loader ? await loader().catch(() => faStar) : faStar;
  iconCache.set(key, loaded);
  return loaded;
}

export function resolveIcon(iconName: string): IconDefinition {
  return iconCache.get(iconName?.trim() || "star") ?? faStar;
}
