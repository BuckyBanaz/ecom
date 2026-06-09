import * as solidIcons from "@fortawesome/free-solid-svg-icons";
import * as brandIcons from "@fortawesome/free-brands-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

const iconList = [...Object.values(solidIcons), ...Object.values(brandIcons)]
  .filter((icon): icon is IconDefinition => {
    return Boolean(icon && typeof icon === "object" && "iconName" in icon);
  })
  .sort((a, b) => a.iconName.localeCompare(b.iconName));

const iconMap = new Map(iconList.map((icon) => [icon.iconName, icon]));

export { iconList, iconMap };
