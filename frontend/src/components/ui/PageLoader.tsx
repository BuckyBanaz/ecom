import { useEffect, useRef, useState } from "react";

export function LottieLoader({ className = "w-24 h-24" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lottie, setLottie] = useState<any>(null);

  useEffect(() => {
    if ((window as any).lottie) {
      setLottie((window as any).lottie);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js";
    script.async = true;
    script.onload = () => {
      setLottie((window as any).lottie);
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!lottie || !containerRef.current) return;

    let isMounted = true;
    let anim: any = null;

    fetch("/lottie.json")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted || !containerRef.current) return;

        // Theme the Lottie colors dynamically to match Schip & Ster primary theme (coffee/beige)
        let jsonString = JSON.stringify(data);
        
        // #1570EF (Blue stroke) -> #c28b57 (Coffee stroke [0.7608, 0.5451, 0.3412])
        jsonString = jsonString.replace(/\[0\.0824,0\.4392,0\.9373,1\]/g, '[0.7608,0.5451,0.3412,1]');
        jsonString = jsonString.replace(/\[0\.0824,0\.4392,0\.9373\]/g, '[0.7608,0.5451,0.3412]');
        
        // #EAF3FF (Light blue fill) -> #f8f0e5 (Soft cream fill [0.9725, 0.9373, 0.898])
        jsonString = jsonString.replace(/\[0\.9176,0\.9529,1,1\]/g, '[0.9725,0.9373,0.898,1]');
        jsonString = jsonString.replace(/\[0\.9176,0\.9529,1\]/g, '[0.9725,0.9373,0.898]');
        
        const themedData = JSON.parse(jsonString);

        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData: themedData,
        });
      })
      .catch((err) => {
        console.error("Failed to load Lottie animation:", err);
      });

    return () => {
      isMounted = false;
      if (anim) {
        anim.destroy();
      }
    };
  }, [lottie]);

  return <div ref={containerRef} className={className} />;
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
      <LottieLoader className="w-28 h-28" />
    </div>
  );
}

export function SectionLoader({ size = 70 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div style={{ width: size, height: size }}>
        <LottieLoader className="w-full h-full" />
      </div>
    </div>
  );
}
