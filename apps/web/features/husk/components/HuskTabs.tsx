import type { HuskTab } from "../types";
import { tabs } from "./huskConfig";

export function HuskTabs({
  selectedTab,
  onSelectTab,
}: {
  selectedTab: HuskTab;
  onSelectTab: (tab: HuskTab) => void;
}) {
  return (
    <div className="husk-tabs" role="tablist" aria-label="Velg husk-visning">
      {tabs.map((tab) => {
        const isSelected = selectedTab === tab.value;

        return (
          <button
            aria-selected={isSelected}
            className={`husk-tabs__option${isSelected ? " husk-tabs__option--selected" : ""}`}
            aria-controls={`husk-panel-${tab.value}`}
            id={`husk-tab-${tab.value}`}
            key={tab.value}
            onClick={() => onSelectTab(tab.value)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
