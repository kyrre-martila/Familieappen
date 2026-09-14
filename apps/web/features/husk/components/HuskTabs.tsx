import type { HuskTab } from "../types";
import { AppTabs } from "../../../components/app-ui";
import { tabs } from "./huskConfig";

export function HuskTabs({
  selectedTab,
  onSelectTab,
}: {
  selectedTab: HuskTab;
  onSelectTab: (tab: HuskTab) => void;
}) {
  return <AppTabs ariaLabel="Velg husk-visning" className="husk-tabs" onSelect={onSelectTab} options={tabs} selected={selectedTab} />;
}
