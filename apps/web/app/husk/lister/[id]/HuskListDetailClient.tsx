"use client";

import { useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronUp, Gift, GripVertical, MoreHorizontal, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { LockedFeatureState } from "../../../../components/PendingAccess";
import { useFamilyAccess } from "../../../../components/ProtectedFamilyRoute";
import type { HuskFamilyMember, HuskListDetail, HuskListDetailItem, HuskListSection } from "../../mockHuskData";

const sectionLabels = {
  active: "Pågår",
  completed: "Fullført",
} satisfies Record<HuskListSection, string>;

function getMembers(memberIds: string[], members: HuskFamilyMember[]) {
  return memberIds.map((memberId) => members.find((member) => member.id === memberId)).filter((member): member is HuskFamilyMember => Boolean(member));
}

function StackedAvatars({ members, maxVisible = 3 }: { members: HuskFamilyMember[]; maxVisible?: number }) {
  const visibleMembers = members.slice(0, maxVisible);
  const hiddenCount = Math.max(members.length - visibleMembers.length, 0);

  return (
    <span className="list-detail-avatars" aria-label={members.map((member) => member.name).join(", ")}>
      {visibleMembers.map((member) => (
        <span className={`list-detail-avatar list-detail-avatar--${member.tone}`} key={member.id} aria-hidden="true">
          {member.initials}
        </span>
      ))}
      {hiddenCount > 0 ? <span className="list-detail-avatar-count" aria-hidden="true">+{hiddenCount}</span> : null}
    </span>
  );
}

function AssignedAvatars({ members }: { members: HuskFamilyMember[] }) {
  if (members.length === 0) {
    return <span className="list-detail-row__empty-assignee" aria-hidden="true" />;
  }

  return <StackedAvatars members={members} maxVisible={3} />;
}

function ListStatusIcon({ completed }: { completed: boolean }) {
  return (
    <span className={`list-detail-status${completed ? " list-detail-status--done" : ""}`} aria-hidden="true">
      {completed ? <Check size={22} strokeWidth={3} /> : null}
    </span>
  );
}

function ListItemRow({
  item,
  list,
  isExpanded,
  onToggle,
  onTitleChange,
  onDescriptionChange,
}: {
  item: HuskListDetailItem;
  list: HuskListDetail;
  isExpanded: boolean;
  onToggle: () => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
}) {
  const assignedMembers = getMembers(item.assignedMemberIds, list.familyMembers);
  const primaryAssignee = assignedMembers[0] ?? null;

  if (isExpanded) {
    return (
      <article className="list-detail-item list-detail-item--expanded">
        <button className="list-detail-item__status-button" type="button" onClick={onToggle} aria-label={`Lukk punktet ${item.title}`}>
          <ListStatusIcon completed={item.completed} />
        </button>
        <div className="list-detail-editor" aria-label={`Rediger punkt: ${item.title}`}>
          <div className="list-detail-editor__topline">
            <input className="list-detail-editor__title" aria-label="Tittel" value={item.title} onChange={(event) => onTitleChange(event.target.value)} />
            <button className="list-detail-editor__collapse" type="button" onClick={onToggle} aria-label="Lukk redigering">
              <ChevronUp size={23} strokeWidth={2.5} />
            </button>
          </div>
          <label className="list-detail-field">
            <span>Beskrivelse</span>
            <textarea aria-label="Beskrivelse" value={item.description ?? ""} onChange={(event) => onDescriptionChange(event.target.value)} rows={2} />
          </label>
          <label className="list-detail-field">
            <span>Ansvarlig</span>
            <span className="list-detail-select-like">
              {primaryAssignee ? <span className={`list-detail-avatar list-detail-avatar--${primaryAssignee.tone}`} aria-hidden="true">{primaryAssignee.initials}</span> : null}
              <strong>{primaryAssignee?.name ?? "Ikke valgt"}</strong>
              <ChevronDown className="list-detail-select-like__chevron" aria-hidden="true" size={21} strokeWidth={2.5} />
            </span>
          </label>
          <label className="list-detail-field">
            <span>Frist</span>
            <span className="list-detail-date-like">
              <CalendarDays aria-hidden="true" size={22} strokeWidth={2.35} />
              <strong>{item.dueLabel ?? "Ingen frist"}</strong>
              <X className="list-detail-date-like__clear" aria-hidden="true" size={20} strokeWidth={2.4} />
            </span>
          </label>
          <button className="list-detail-delete" type="button">Slett punkt</button>
        </div>
      </article>
    );
  }

  return (
    <button className={`list-detail-row${item.completed ? " list-detail-row--completed" : ""}`} type="button" onClick={onToggle} aria-expanded={false}>
      <ListStatusIcon completed={item.completed} />
      <span className="list-detail-row__title">{item.title}</span>
      <AssignedAvatars members={assignedMembers} />
      <GripVertical className="list-detail-row__handle" aria-hidden="true" size={22} strokeWidth={2.2} />
    </button>
  );
}

export function HuskListDetailClient({ list }: { list: HuskListDetail }) {
  const router = useRouter();
  const familyAccess = useFamilyAccess();
  const [selectedSection, setSelectedSection] = useState<HuskListSection>("active");
  const [expandedItemId, setExpandedItemId] = useState<string>("kirke-bekreftet");
  const [listItems, setListItems] = useState<HuskListDetailItem[]>(list.items);
  const sectionItems = listItems.filter((item) => (selectedSection === "completed" ? item.completed : !item.completed));
  const completedCount = listItems.filter((item) => item.completed).length;
  const activeCount = listItems.length - completedCount;
  const progressPercent = list.totalCount > 0 ? Math.round((list.completedCount / list.totalCount) * 100) : 0;
  const expandedItem = listItems.find((item) => item.id === expandedItemId);

  function updateMockItem(itemId: string, update: Partial<Pick<HuskListDetailItem, "title" | "description">>) {
    setListItems((currentItems) => currentItems.map((item) => (item.id === itemId ? { ...item, ...update } : item)));
  }

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved") {
    return <main className="list-detail list-detail--state">Sjekker familietilgang …</main>;
  }

  return (
    <main className="list-detail" aria-labelledby="list-detail-title">
      <div className="list-detail__topbar" aria-label="Listenavigasjon">
        <button className="list-detail__icon-button" type="button" onClick={() => router.back()} aria-label="Gå tilbake til Lister">
          <ChevronLeft aria-hidden="true" size={30} strokeWidth={2.8} />
        </button>
        <button className="list-detail__icon-button" type="button" aria-label="Flere valg for listen">
          <MoreHorizontal aria-hidden="true" size={30} strokeWidth={2.8} />
        </button>
      </div>

      <div className="list-detail__scroll">
        <header className="list-detail__hero">
          <span className="list-detail__list-icon" aria-hidden="true">
            <Gift size={48} strokeWidth={2.15} />
          </span>
          <div className="list-detail__headline">
            <div className="list-detail__title-row">
              <h1 className="list-detail__title" id="list-detail-title">{list.title}</h1>
              {expandedItem ? (
                <span className="list-detail__saved-badge" aria-live="polite">
                  <Check aria-hidden="true" size={17} strokeWidth={3} />
                  Saved
                </span>
              ) : null}
            </div>
            <p className="list-detail__scope">
              <Users aria-hidden="true" size={18} strokeWidth={2.4} />
              {list.scopeText}
            </p>
            <div className="list-detail__progress-row">
              <div className="list-detail__progress-copy">
                <p>{list.completedCount} av {list.totalCount} fullført</p>
                <span className="list-detail__progress" aria-hidden="true">
                  <span className="list-detail__progress-fill" style={{ width: `${progressPercent}%` }} />
                </span>
              </div>
              <StackedAvatars members={list.familyMembers} maxVisible={3} />
            </div>
          </div>
        </header>

        <div className="list-detail-tabs" role="tablist" aria-label="Listepunkter">
          {(["active", "completed"] as const).map((section) => {
            const isSelected = selectedSection === section;
            const count = section === "active" ? activeCount : completedCount;

            return (
              <button
                aria-selected={isSelected}
                className={`list-detail-tabs__button${isSelected ? " list-detail-tabs__button--selected" : ""}`}
                key={section}
                onClick={() => setSelectedSection(section)}
                role="tab"
                type="button"
              >
                {sectionLabels[section]}
                <span>{count}</span>
              </button>
            );
          })}
        </div>

        <section className="list-detail-items" aria-label={sectionLabels[selectedSection]}>
          {sectionItems.map((item) => (
            <ListItemRow
              item={item}
              key={item.id}
              list={list}
              isExpanded={expandedItemId === item.id}
              onToggle={() => setExpandedItemId((currentId) => (currentId === item.id ? "" : item.id))}
              onTitleChange={(title) => updateMockItem(item.id, { title })}
              onDescriptionChange={(description) => updateMockItem(item.id, { description })}
            />
          ))}
        </section>
      </div>

      <div className="list-detail__sticky-action">
        <button className="list-detail__add-button" type="button">
          <span aria-hidden="true">+</span>
          Legg til punkt
        </button>
      </div>
    </main>
  );
}
