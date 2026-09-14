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
  const options = tabs.map((tab) => {
    const idSuffix = tab.value === "paminnelser" ? "husk" : tab.value;

    return {
      ...tab,
      panelId: `husk-panel-${idSuffix}`,
      tabId: `husk-tab-${idSuffix}`,
    };
  });

  return (
    <AppTabs
      ariaLabel="Velg husk-visning"
      className="husk-tabs"
      onSelect={onSelectTab}
      options={options}
      selected={selectedTab}
    />
  );
}
