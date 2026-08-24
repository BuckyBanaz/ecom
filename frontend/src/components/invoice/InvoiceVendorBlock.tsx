import type { InvoiceVendor } from "@/utils/invoiceVendor";

type Props = {
  vendor: InvoiceVendor;
  title: string;
};

export function InvoiceVendorBlock({ vendor, title }: Props) {
  return (
    <div>
      <h4 className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">{title}</h4>
      <p className="mt-1 font-semibold">{vendor.vendorName}</p>
      <p>{vendor.vendorAddress}</p>
      <p>{vendor.vendorEmail}</p>
    </div>
  );
}
