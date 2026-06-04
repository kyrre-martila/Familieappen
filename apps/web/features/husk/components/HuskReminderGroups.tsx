import type {
  HuskFamilyMember,
  HuskReminder,
  HuskReminderGroup,
} from "../types";
import { reminderGroupLabels } from "./huskConfig";
import { HuskReminderCard } from "./HuskReminderCard";
import { SectionHeader } from "./shared/SectionHeader";

export function HuskReminderGroups({
  familyMembers,
  groupedReminders,
  onOpenReminder,
  previousReminders,
  showPrevious,
}: {
  familyMembers: HuskFamilyMember[];
  groupedReminders: { group: HuskReminderGroup; reminders: HuskReminder[] }[];
  onOpenReminder: (reminder: HuskReminder) => void;
  previousReminders: HuskReminder[];
  showPrevious: boolean;
}) {
  return (
    <div className="husk-reminder-groups">
      {showPrevious && previousReminders.length > 0 ? (
        <section
          className="husk-reminder-group"
          aria-labelledby="husk-reminder-group-previous"
        >
          <SectionHeader
            count={previousReminders.length}
            countClassName="husk-reminder-group__count--previous"
            countLabel={`${previousReminders.length} tidligere påminnelser`}
            id="husk-reminder-group-previous"
            title="Tidligere"
          />
          <div className="husk-card-list">
            {previousReminders.map((reminder) => (
              <HuskReminderCard
                familyMembers={familyMembers}
                key={reminder.id}
                reminder={reminder}
                onOpen={onOpenReminder}
              />
            ))}
          </div>
        </section>
      ) : null}
      {groupedReminders.map(({ group, reminders: groupReminders }) => (
        <section
          className="husk-reminder-group"
          key={group}
          aria-labelledby={`husk-reminder-group-${group}`}
        >
          <SectionHeader
            count={groupReminders.length}
            countClassName={`husk-reminder-group__count--${group}`}
            countLabel={`${groupReminders.length} påminnelser`}
            id={`husk-reminder-group-${group}`}
            title={reminderGroupLabels[group]}
          />
          <div className="husk-card-list">
            {groupReminders.map((reminder) => (
              <HuskReminderCard
                familyMembers={familyMembers}
                key={reminder.id}
                reminder={reminder}
                onOpen={onOpenReminder}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
