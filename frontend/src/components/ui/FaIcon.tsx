import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faStar } from "@fortawesome/free-solid-svg-icons/faStar";
import { resolveIcon, resolveIconAsync } from "@/utils/fontawesome";

type FaIconProps = {
  name: string;
  className?: string;
};

export function FaIcon({ name, className }: FaIconProps) {
  const [icon, setIcon] = useState<IconDefinition>(() => resolveIcon(name));

  useEffect(() => {
    let cancelled = false;
    const cached = resolveIcon(name);
    if (cached.iconName !== "star" || name === "star") {
      setIcon(cached);
      return;
    }

    resolveIconAsync(name).then((loaded) => {
      if (!cancelled) setIcon(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [name]);

  return <FontAwesomeIcon icon={icon ?? faStar} className={className} />;
}
