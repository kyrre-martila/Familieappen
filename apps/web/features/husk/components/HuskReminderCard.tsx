import { UserAvatar } from "../../../components/avatar/UserAvatar";
import type { HuskFamilyMember, HuskReminder } from "../types";
import { reminderIcons } from "./huskConfig";

function ReminderAvatars({ members }: { members: HuskFamilyMember[] }) {
  return (
    <span
      className="husk-reminder-card__avatars"
      aria-label={members.map((member) => member.name).join(", ")}
    >
      {members.map((member) => (
        <UserAvatar
          identity={member}
          avatarUrl={member.avatarUrl}
          size="xs"
          className="husk-avatar"
          decorative
          key={member.id}
        />
      ))}
    </span>
  );
}

export function HuskReminderCard({
  familyMembers,
  onOpen,
  reminder,
}: {
  familyMembers: HuskFamilyMember[];
  onOpen: (reminder: HuskReminder) => void;
  reminder: HuskReminder;
}) {
  const Icon = reminderIcons[reminder.icon];
  const members = reminder.memberIds
    .map((memberId) => familyMembers.find((member) => member.id === memberId))
    .filter((member): member is HuskFamilyMember => Boolean(member));

  return (
    <button
      className={`husk-reminder-card husk-reminder-card--${reminder.tone}`}
      type="button"
      onClick={() => onOpen(reminder)}
      aria-label={`Vis husk ${reminder.title}`}
    >
      <span className="husk-reminder-card__icon" aria-hidden="true">
        <Icon size={23} strokeWidth={2.25} />
      </span>
      <span className="husk-reminder-card__content">
        <span className="husk-reminder-card__title">{reminder.title}</span>
        <span className="husk-reminder-card__meta">
          {reminder.scopeText} <span aria-hidden="true">•</span>{" "}
          {reminder.dateLabel}
        </span>
      </span>
      <ReminderAvatars members={members} />
    </button>
  );
}
