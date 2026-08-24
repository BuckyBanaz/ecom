import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CreditCard, Facebook, Instagram, ShieldCheck, Truck, Youtube } from "lucide-react";
import { FaIcon } from "@/components/ui/FaIcon";
import { cmsHeaderFooterRepository } from "@/client/apiClient";
import { useCmsData } from "@/hooks/useCmsData";
import { useCmsLabel } from "@/hooks/useCmsLabel";
import { Logo } from "./Logo";

function FooterColumn({ column }: { column: { title: string; links: { label: string; href: string }[] } }) {
  const title = useCmsLabel(column.title);
  return (
    <div>
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">{title}</h3>
      <ul className="space-y-2 text-sm text-secondary-foreground/75">
        {column.links.map((l) => (
          <FooterLink key={`${column.title}-${l.label}`} link={l} />
        ))}
      </ul>
    </div>
  );
}

function FooterLink({ link }: { link: { label: string; href: string } }) {
  const label = useCmsLabel(link.label);
  return (
    <li>
      <Link to={link.href || "/help"} className="hover:text-primary">{label}</Link>
    </li>
  );
}

function FooterBottomItem({ item }: { item: { icon?: string; text: string } }) {
  const text = useCmsLabel(item.text);
  return (
    <span className="flex items-center gap-2">
      {item.icon && <FaIcon name={item.icon} className="h-3.5 w-3.5" />} {text}
    </span>
  );
}

export function Footer() {
  const { t } = useTranslation();
  const { data: footerData } = useCmsData("header_footer_data", () => cmsHeaderFooterRepository.get());
  const aboutDescription = useCmsLabel(footerData?.footerAbout?.description);

  const footerSocial = footerData?.footerSocial;
  const footerColumns = footerData?.footerColumns || [];
  const footerBottom = footerData?.footerBottom || [];
  const normalizedSocial = Array.isArray(footerSocial)
    ? footerSocial
    : footerSocial
      ? [
          { icon: "facebook", label: "Facebook", href: footerSocial.facebook || "#" },
          { icon: "instagram", label: "Instagram", href: footerSocial.instagram || "#" },
          { icon: "youtube", label: "Youtube", href: footerSocial.youtube || "#" },
        ]
      : [];

  return (
    <footer className="mt-20 bg-secondary text-secondary-foreground">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-secondary-foreground/70">
            {aboutDescription || t("footer.about_description")}
          </p>
          <div className="mt-6 flex items-center gap-3">
            {footerData ? (
              normalizedSocial.map((item: any, idx: number) => (
                  <a
                    key={`${item.label}-${idx}`}
                    href={item.href || "#"}
                    aria-label={item.label || "Social"}
                    className="grid h-10 w-10 place-items-center rounded-full bg-black/5 text-secondary-foreground hover:bg-primary hover:text-white transition-colors"
                  >
                    {item.icon ? <FaIcon name={item.icon} className="h-4 w-4" /> : <Facebook size={18} />}
                  </a>
                ))
            ) : (
              <>
                <a href="#" aria-label="Facebook" className="grid h-10 w-10 place-items-center rounded-full bg-black/5 text-secondary-foreground hover:bg-primary hover:text-white transition-colors"><Facebook size={18} /></a>
                <a href="#" aria-label="Instagram" className="grid h-10 w-10 place-items-center rounded-full bg-black/5 text-secondary-foreground hover:bg-primary hover:text-white transition-colors"><Instagram size={18} /></a>
                <a href="#" aria-label="Youtube" className="grid h-10 w-10 place-items-center rounded-full bg-black/5 text-secondary-foreground hover:bg-primary hover:text-white transition-colors"><Youtube size={18} /></a>
              </>
            )}
          </div>
        </div>
        {footerColumns.map((c: any) => (
          <FooterColumn key={c.title} column={c} />
        ))}
      </div>
      <div className="border-t border-black/10">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-6 text-xs text-secondary-foreground/70 md:flex-row">
          <div className="flex items-center gap-6">
            {footerBottom.length > 0 ? (
              footerBottom.map((item: any, idx: number) => (
                <FooterBottomItem key={`${item.text}-${idx}`} item={item} />
              ))
            ) : (
              <>
                <span className="flex items-center gap-2"><Truck size={14}/> {t("footer.free_shipping")}</span>
                <span className="flex items-center gap-2"><ShieldCheck size={14}/> {t("footer.secure_checkout")}</span>
                <span className="flex items-center gap-2"><CreditCard size={14}/> {t("footer.payment_methods")}</span>
              </>
            )}
          </div>
          <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}