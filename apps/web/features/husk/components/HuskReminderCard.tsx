import { MoreHorizontal } from "lucide-react";

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
  onDelete,
  onEdit,
  onOpen,
  openMenuReminderId,
  reminder,
  setOpenMenuReminderId,
}: {
  familyMembers: HuskFamilyMember[];
  onDelete: (reminder: HuskReminder) => void;
  onEdit: (reminder: HuskReminder) => void;
  onOpen: (reminder: HuskReminder) => void;
  openMenuReminderId: string | null;
  reminder: HuskReminder;
  setOpenMenuReminderId: (reminderId: string | null) => void;
}) {
  const Icon = reminderIcons[reminder.icon];
  const members = reminder.memberIds
    .map((memberId) => familyMembers.find((member) => member.id === memberId))
    .filter((member): member is HuskFamilyMember => Boolean(member));

  const isMenuOpen = openMenuReminderId === reminder.id;

  return (
    <article
      className={`husk-reminder-card husk-reminder-card--${reminder.tone}`}
    >
      <button
        className="husk-reminder-card__main"
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
      <div className="husk-reminder-card__menu-wrap">
        <button
          className="husk-reminder-card__menu-button"
          type="button"
          aria-label={`Åpne valg for ${reminder.title}`}
          aria-expanded={isMenuOpen}
          onClick={() => setOpenMenuReminderId(isMenuOpen ? null : reminder.id)}
        >
          <MoreHorizontal aria-hidden="true" size={20} strokeWidth={2.5} />
        </button>
        {isMenuOpen ? (
          <div className="husk-reminder-card__menu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenMenuReminderId(null);
                onEdit(reminder);
              }}
            >
              Rediger
            </button>
            <button
              type="button"
              role="menuitem"
              className="husk-reminder-card__menu-delete"
              onClick={() => {
                setOpenMenuReminderId(null);
                onDelete(reminder);
              }}
            >
              Slett
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
