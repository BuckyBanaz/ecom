import { Wrench } from "lucide-react";

interface MaintenancePageProps {
  storeName?: string;
  message?: string;
}

const MaintenancePage = ({ storeName, message }: MaintenancePageProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4">
      <div className="max-w-lg w-full text-center space-y-6 bg-card border rounded-2xl p-8 sm:p-12 shadow-lg">
        <div className="flex items-center justify-center gap-2 md:gap-3">
          <img
            src="/favicon.png"
            alt={`${storeName || "Store"} Logo`}
            className="h-10 w-10 md:h-12 md:w-12 object-contain shrink-0"
          />
          <div className="h-6 md:h-7 w-px bg-[#b17e4a]/70 shrink-0" />
          <span
            className="text-xl md:text-2xl font-normal tracking-wide text-[#593c28] whitespace-nowrap leading-none"
            style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", paddingBottom: "1px" }}
          >
            {storeName || "Schip & Ster"}
          </span>
        </div>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
          <Wrench className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Under maintenance
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            {message || "We're currently performing maintenance. We'll be back shortly!"}
          </p>
        </div>
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Thank you for your patience.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
