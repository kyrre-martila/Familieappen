"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, MoreHorizontal, Pencil, Plus } from "lucide-react";
import { SettingsCard, SettingsSection } from "../../../components/settings";
import { useFamilyAccess } from "../../../components/ProtectedFamilyRoute";
import {
  getFamily,
  getFamilyInvitations,
  inviteFamilyMemberByEmail,
  removeFamilyMember,
  resendFamilyInvitation,
  revokeFamilyInvitation,
  updateFamily,
  updateFamilyMember,
  type Family,
  type FamilyInvitation,
  type FamilyMember,
  type ManualFamilyMemberRole
} from "../../../lib/api";

type SheetMode =
  | { type: "family-name" }
  | { type: "edit-member"; member: FamilyMember }
  | { type: "remove-member"; member: FamilyMember }
  | { type: "invite" }
  | { type: "revoke-invite"; invitation: FamilyInvitation }
  | null;

type RoleChoice = "ADMIN" | "MEMBER" | "CHILD";
type PendingAction = "save-family-name" | "edit-member" | "remove-member" | "send-invite" | "resend-invite" | "revoke-invite" | null;

function isAdminRole(role: FamilyMember["role"]) {
  return role === "OWNER" || role === "PARENT";
}

function roleToChoice(role: FamilyMember["role"]): RoleChoice {
  if (role === "CHILD") return "CHILD";
  if (role === "OWNER" || role === "PARENT") return "ADMIN";
  return "MEMBER";
}

function choiceToApiRole(choice: RoleChoice): ManualFamilyMemberRole {
  if (choice === "ADMIN") return "PARENT";
  if (choice === "CHILD") return "CHILD";
  return "GUEST";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("nb-NO"))
    .join("") || "FA";
}

function getFamilyCode(family: Family | null) {
  if (!family?.id) return "FAMILIE";
  return `FA-${family.id.replace(/[^a-z0-9]/gi, "").slice(-6).toLocaleUpperCase("nb-NO") || "FAMILIE"}`;
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("nb-NO", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function getRoleLine(member: FamilyMember) {
  if (member.role === "CHILD") {
    return "Barn";
  }

  return isAdminRole(member.role) ? "Administrator" : "Medlem";
}

function getStatusLabel(status: FamilyInvitation["status"]) {
  return {
    pending: "Venter",
    accepted: "Akseptert",
    declined: "Avslått",
    revoked: "Tilbaketrukket"
  }[status];
}

function inviteEmailDeliveryFailed(response: unknown) {
  if (!response || typeof response !== "object") return false;

  const payload = response as {
    email?: {
      ok?: boolean;
    };
    emailSent?: boolean;
    emailDelivered?: boolean;
    emailDeliveryStatus?: string;
    emailDeliveryState?: string;
    deliveryStatus?: string;
  };

  if (payload.email?.ok === false) return true;

  const deliveryState = payload.emailDeliveryStatus ?? payload.emailDeliveryState ?? payload.deliveryStatus;

  if (payload.emailSent === false || payload.emailDelivered === false) return true;
  return typeof deliveryState === "string" && ["failed", "failure", "error", "not_sent"].includes(deliveryState.toLowerCase());
}


function FamilyNameSheet({ name, isPending, onCancel, onSave }: { name: string; isPending: boolean; onCancel: () => void; onSave: (name: string) => void }) {
  const [value, setValue] = useState(name);
  const [error, setError] = useState("");

  function handleSave() {
    if (!value.trim()) {
      setError("Familienavn må fylles ut.");
      return;
    }
    if (!isPending) {
      onSave(value.trim());
    }
  }

  return (
    <div className="profile-edit-sheet" role="presentation">
      <button className="profile-edit-sheet__backdrop" type="button" aria-label="Avbryt" onClick={onCancel} disabled={isPending} />
      <section className="profile-edit-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="family-name-title">
        <div className="profile-edit-sheet__handle" aria-hidden="true" />
        <h2 id="family-name-title">Endre familienavn</h2>
        <label className="profile-edit-sheet__field">
          <span>Familienavn</span>
          <input autoFocus value={value} onChange={(event) => { setValue(event.target.value); setError(""); }} disabled={isPending} />
        </label>
        {error ? <p className="profile-edit-sheet__error">{error}</p> : null}
        <div className="profile-edit-sheet__actions">
          <button className="profile-edit-sheet__button profile-edit-sheet__button--secondary" type="button" onClick={onCancel} disabled={isPending}>Avbryt</button>
          <button className="profile-edit-sheet__button profile-edit-sheet__button--primary" type="button" onClick={handleSave} disabled={isPending}>{isPending ? "Lagrer …" : "Lagre"}</button>
        </div>
      </section>
    </div>
  );
}

function MemberEditSheet({ member, isPending, onCancel, onSave }: { member: FamilyMember; isPending: boolean; onCancel: () => void; onSave: (displayName: string, role: RoleChoice) => void }) {
  const [displayName, setDisplayName] = useState(member.displayName);
  const [role, setRole] = useState<RoleChoice>(roleToChoice(member.role));
  const [error, setError] = useState("");

  function handleSave() {
    if (!displayName.trim()) {
      setError("Navn må fylles ut.");
      return;
    }
    if (!isPending) {
      onSave(displayName.trim(), role);
    }
  }

  return (
    <div className="profile-edit-sheet" role="presentation">
      <button className="profile-edit-sheet__backdrop" type="button" aria-label="Avbryt" onClick={onCancel} disabled={isPending} />
      <section className="profile-edit-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="member-edit-title">
        <div className="profile-edit-sheet__handle" aria-hidden="true" />
        <h2 id="member-edit-title">Rediger medlem</h2>
        <label className="profile-edit-sheet__field">
          <span>Navn</span>
          <input autoFocus value={displayName} onChange={(event) => { setDisplayName(event.target.value); setError(""); }} disabled={isPending} />
        </label>
        <label className="profile-edit-sheet__field">
          <span>Rolle</span>
          <select value={role} onChange={(event) => setRole(event.target.value as RoleChoice)} disabled={isPending}>
            <option value="ADMIN">Administrator</option>
            <option value="MEMBER">Medlem</option>
            <option value="CHILD">Barn</option>
          </select>
        </label>
        {error ? <p className="profile-edit-sheet__error">{error}</p> : null}
        <div className="profile-edit-sheet__actions">
          <button className="profile-edit-sheet__button profile-edit-sheet__button--secondary" type="button" onClick={onCancel} disabled={isPending}>Avbryt</button>
          <button className="profile-edit-sheet__button profile-edit-sheet__button--primary" type="button" onClick={handleSave} disabled={isPending}>{isPending ? "Lagrer …" : "Lagre"}</button>
        </div>
      </section>
    </div>
  );
}

function InviteSheet({ isPending, onCancel, onSend }: { isPending: boolean; onCancel: () => void; onSend: (email: string, role: RoleChoice) => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleChoice>("MEMBER");
  const [error, setError] = useState("");

  function handleSend() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Skriv inn en gyldig e-postadresse.");
      return;
    }
    if (!isPending) {
      onSend(email.trim(), role);
    }
  }

  return (
    <div className="profile-edit-sheet" role="presentation">
      <button className="profile-edit-sheet__backdrop" type="button" aria-label="Avbryt" onClick={onCancel} disabled={isPending} />
      <section className="profile-edit-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="invite-title">
        <div className="profile-edit-sheet__handle" aria-hidden="true" />
        <h2 id="invite-title">Inviter familiemedlem</h2>
        <label className="profile-edit-sheet__field">
          <span>E-post</span>
          <input autoFocus inputMode="email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} disabled={isPending} />
        </label>
        <label className="profile-edit-sheet__field">
          <span>Rolle</span>
          <select value={role} onChange={(event) => setRole(event.target.value as RoleChoice)} disabled={isPending}>
            <option value="ADMIN">Administrator</option>
            <option value="MEMBER">Medlem</option>
            <option value="CHILD">Barn</option>
          </select>
        </label>
        {error ? <p className="profile-edit-sheet__error">{error}</p> : null}
        <div className="profile-edit-sheet__actions">
          <button className="profile-edit-sheet__button profile-edit-sheet__button--secondary" type="button" onClick={onCancel} disabled={isPending}>Avbryt</button>
          <button className="profile-edit-sheet__button profile-edit-sheet__button--primary" type="button" onClick={handleSend} disabled={isPending}>{isPending ? "Sender …" : "Send invitasjon"}</button>
        </div>
      </section>
    </div>
  );
}

function RemoveSheet({ member, isSelf, isPending, onCancel, onRemove }: { member: FamilyMember; isSelf: boolean; isPending: boolean; onCancel: () => void; onRemove: () => void }) {
  return (
    <div className="profile-edit-sheet" role="presentation">
      <button className="profile-edit-sheet__backdrop" type="button" aria-label="Avbryt" onClick={onCancel} disabled={isPending} />
      <section className="profile-edit-sheet__panel profile-edit-sheet__panel--compact" role="dialog" aria-modal="true" aria-labelledby="remove-member-title">
        <div className="profile-edit-sheet__handle" aria-hidden="true" />
        <h2 id="remove-member-title">Fjerne familiemedlem?</h2>
        <p className="profile-edit-sheet__placeholder-text">{isSelf ? "Du mister tilgang til familien og må inviteres på nytt for å få tilgang igjen." : "Personen mister tilgang til familien og delt innhold."}</p>
        <div className="profile-edit-sheet__actions">
          <button className="profile-edit-sheet__button profile-edit-sheet__button--secondary" type="button" onClick={onCancel} disabled={isPending}>Avbryt</button>
          <button className="profile-edit-sheet__button profile-edit-sheet__button--danger" type="button" onClick={onRemove} disabled={isPending}>{isPending ? "Fjerner …" : "Fjern"}</button>
        </div>
      </section>
    </div>
  );
}

function RevokeInviteSheet({ invitation, isPending, onCancel, onRevoke }: { invitation: FamilyInvitation; isPending: boolean; onCancel: () => void; onRevoke: () => void }) {
  return (
    <div className="profile-edit-sheet" role="presentation">
      <button className="profile-edit-sheet__backdrop" type="button" aria-label="Avbryt" onClick={onCancel} disabled={isPending} />
      <section className="profile-edit-sheet__panel profile-edit-sheet__panel--compact" role="dialog" aria-modal="true" aria-labelledby="revoke-invite-title">
        <div className="profile-edit-sheet__handle" aria-hidden="true" />
        <h2 id="revoke-invite-title">Trekke tilbake invitasjon?</h2>
        <p className="profile-edit-sheet__placeholder-text">Denne invitasjonen blir ugyldig.</p>
        <p className="profile-edit-sheet__placeholder-text">{invitation.invitedEmail}</p>
        <div className="profile-edit-sheet__actions">
          <button className="profile-edit-sheet__button profile-edit-sheet__button--secondary" type="button" onClick={onCancel} disabled={isPending}>Avbryt</button>
          <button className="profile-edit-sheet__button profile-edit-sheet__button--danger" type="button" onClick={onRevoke} disabled={isPending}>{isPending ? "Trekker tilbake …" : "Trekk tilbake"}</button>
        </div>
      </section>
    </div>
  );
}

export function FamilySettingsClient() {
  const access = useFamilyAccess();
  const activeFamilyId = access.familyContext?.activeFamilyId ?? null;
  const activeFamily = access.familyContext?.families.find((item) => item.family.id === activeFamilyId) ?? null;
  const currentMembership = activeFamily?.membership ?? null;
  const isAdmin = currentMembership ? isAdminRole(currentMembership.role) : false;
  const [family, setFamily] = useState<Family | null>(activeFamily?.family ?? null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invitations, setInvitations] = useState<FamilyInvitation[]>([]);
  const [sheet, setSheet] = useState<SheetMode>(null);
  const [openMemberMenu, setOpenMemberMenu] = useState<string | null>(null);
  const [openInviteMenu, setOpenInviteMenu] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const pendingActionRef = useRef<PendingAction>(null);

  const creatorName = useMemo(() => members.find((member) => member.role === "OWNER")?.displayName ?? currentMembership?.displayName ?? "Ikke tilgjengelig", [members, currentMembership]);
  const administratorCount = members.filter((member) => isAdminRole(member.role)).length;

  async function loadData(showLoading = true) {
    if (!activeFamilyId) {
      setStatus("error");
      return;
    }

    try {
      if (showLoading) {
        setStatus("loading");
      }
      const [details, inviteList] = await Promise.all([getFamily(activeFamilyId), getFamilyInvitations(activeFamilyId).catch(() => [])]);
      setFamily(details.family);
      setMembers(details.members);
      setInvitations(inviteList);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    void loadData();
  }, [activeFamilyId]);

  function beginPendingAction(action: Exclude<PendingAction, null>) {
    if (pendingActionRef.current) return false;
    pendingActionRef.current = action;
    setPendingAction(action);
    return true;
  }

  function endPendingAction() {
    pendingActionRef.current = null;
    setPendingAction(null);
  }

  async function saveFamilyName(name: string) {
    if (!family || !beginPendingAction("save-family-name")) return;
    try {
      await updateFamily(family.id, { name });
      await loadData(false);
      setSheet(null);
    } catch {
      setMessage("Kunne ikke lagre familienavn. Prøv igjen.");
    } finally {
      endPendingAction();
    }
  }

  async function saveMember(member: FamilyMember, displayName: string, role: RoleChoice) {
    if (!family || !beginPendingAction("edit-member")) return;
    try {
      await updateFamilyMember(family.id, member.id, { displayName, role: choiceToApiRole(role) });
      await loadData(false);
      setSheet(null);
    } catch {
      setMessage("Kunne ikke lagre medlemmet. Sjekk at minst én administrator er igjen.");
    } finally {
      endPendingAction();
    }
  }

  async function removeMember(member: FamilyMember) {
    if (!family || !beginPendingAction("remove-member")) return;
    try {
      await removeFamilyMember(family.id, member.id);
      await loadData(false);
      setSheet(null);
    } catch {
      setMessage("Kunne ikke fjerne medlemmet. Minst én administrator må være igjen.");
    } finally {
      endPendingAction();
    }
  }

  async function sendInvite(email: string, role: RoleChoice) {
    if (!family || !beginPendingAction("send-invite")) return;
    try {
      const response = await inviteFamilyMemberByEmail(family.id, { email, role: choiceToApiRole(role) });
      await loadData(false);
      setMessage(inviteEmailDeliveryFailed(response) ? "Invitasjonen ble opprettet, men e-posten kunne ikke sendes." : "Invitasjonen er sendt.");
      setSheet(null);
    } catch {
      setMessage("Kunne ikke sende invitasjonen. Prøv igjen.");
    } finally {
      endPendingAction();
    }
  }

  async function resendInvite(invitation: FamilyInvitation) {
    if (!family || !beginPendingAction("resend-invite")) return;
    try {
      await resendFamilyInvitation(family.id, invitation.id);
      await loadData(false);
      setOpenInviteMenu(null);
    } catch {
      setMessage("Kunne ikke sende invitasjonen på nytt.");
    } finally {
      endPendingAction();
    }
  }

  async function copyFamilyCode() {
    if (!family) return;

    try {
      await navigator.clipboard?.writeText(getFamilyCode(family));
      setMessage("Familiekoden er kopiert.");
    } catch {
      setMessage("Kunne ikke kopiere koden akkurat nå.");
    }
  }

  async function revokeInvite(invitation: FamilyInvitation) {
    if (!family || !beginPendingAction("revoke-invite")) return;
    try {
      await revokeFamilyInvitation(family.id, invitation.id);
      await loadData(false);
      setSheet(null);
      setOpenInviteMenu(null);
    } catch {
      setMessage("Kunne ikke trekke tilbake invitasjonen.");
    } finally {
      endPendingAction();
    }
  }

  if (status === "loading") {
    return <FamilySettingsShell><div className="settings-placeholder-card"><p>Laster familie …</p></div></FamilySettingsShell>;
  }

  if (status === "error" || !family) {
    return (
      <FamilySettingsShell>
        <div className="settings-placeholder-card family-settings__empty">
          <p>Vi fant ikke familien akkurat nå.</p>
          <button className="family-settings__pill-button" type="button" onClick={() => void loadData()}>Prøv igjen</button>
        </div>
      </FamilySettingsShell>
    );
  }

  return (
    <FamilySettingsShell>
      {message ? <p className="family-settings__notice">{message}<button type="button" onClick={() => setMessage("")}>Lukk</button></p> : null}

      <SettingsSection title="Familieinformasjon">
        <SettingsCard>
          <button className="family-settings-row" type="button" onClick={() => isAdmin && setSheet({ type: "family-name" })} disabled={!isAdmin || Boolean(pendingAction)}>
            <span className="family-settings-row__label">Familienavn</span>
            <span className="family-settings-row__value">{family.name}</span>
            {isAdmin ? <Pencil aria-hidden="true" /> : null}
          </button>
          <div className="family-settings-row">
            <span className="family-settings-row__label">Familienøkkel / familiekode</span>
            <span className="family-settings-row__value">{getFamilyCode(family)}</span>
            <button className="family-settings__copy" type="button" onClick={() => void copyFamilyCode()} disabled={Boolean(pendingAction)}>Kopier</button>
          </div>
          <div className="family-settings-row">
            <span className="family-settings-row__label">Opprettet av</span>
            <span className="family-settings-row__value">{creatorName}</span>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Familiemedlemmer">
        <SettingsCard>
          <div className="family-settings__section-head">
            <h2>Familiemedlemmer</h2>
            {isAdmin ? <button className="family-settings__small-button" type="button" onClick={() => setSheet({ type: "invite" })} disabled={Boolean(pendingAction)}><Plus aria-hidden="true" /> Inviter medlem</button> : null}
          </div>
          {members.length ? members.map((member) => {
            const isSelf = member.id === currentMembership?.id;
            const cannotRemoveLastAdmin = isAdminRole(member.role) && administratorCount <= 1;
            return (
              <div className="family-settings-member" key={member.id}>
                <span className="family-settings-member__avatar" aria-hidden="true">{getInitials(member.displayName)}</span>
                <span className="family-settings-member__copy">
                  <span className="family-settings-member__name">{member.displayName}</span>
                  <span className="family-settings-member__role">{getRoleLine(member)}</span>
                </span>
                {isAdmin ? (
                  <span className="family-settings-menu">
                    <button className="family-settings__icon-button" type="button" aria-label={`Handlinger for ${member.displayName}`} onClick={() => setOpenMemberMenu(openMemberMenu === member.id ? null : member.id)} disabled={Boolean(pendingAction)}><MoreHorizontal aria-hidden="true" /></button>
                    {openMemberMenu === member.id ? (
                      <span className="family-settings-menu__panel">
                        <button type="button" onClick={() => { setSheet({ type: "edit-member", member }); setOpenMemberMenu(null); }} disabled={Boolean(pendingAction)}>Rediger medlem</button>
                        <button type="button" disabled={cannotRemoveLastAdmin || Boolean(pendingAction)} onClick={() => { setSheet({ type: "remove-member", member }); setOpenMemberMenu(null); }}>Fjern medlem</button>
                      </span>
                    ) : null}
                    {isSelf ? <span className="family-settings__self-badge">Deg</span> : null}
                  </span>
                ) : null}
              </div>
            );
          }) : <p className="family-settings__empty-text">Ingen familiemedlemmer er lagt til ennå.</p>}
          {!isAdmin ? <p className="family-settings__empty-text">Administratorer kan invitere medlemmer og gjøre endringer.</p> : null}
        </SettingsCard>
      </SettingsSection>

      {isAdmin ? (
        <SettingsSection title="Invitasjoner">
          <SettingsCard>
            <div className="family-settings__section-head">
              <h2>Invitasjoner</h2>
              <button className="family-settings__small-button" type="button" onClick={() => setSheet({ type: "invite" })} disabled={Boolean(pendingAction)}>Inviter familiemedlem</button>
            </div>
            {invitations.length ? invitations.map((invitation) => (
              <div className="family-settings-invite" key={invitation.id}>
                <span className="family-settings-invite__copy">
                  <span className="family-settings-invite__email">{invitation.invitedEmail}</span>
                  <span className="family-settings-invite__date">{formatDate(invitation.createdAt) ?? "Dato ikke tilgjengelig"}</span>
                </span>
                <span className={`family-settings-badge family-settings-badge--${invitation.status}`}>{getStatusLabel(invitation.status)}</span>
                {invitation.status === "pending" ? (
                  <span className="family-settings-menu">
                    <button className="family-settings__icon-button" type="button" aria-label={`Handlinger for ${invitation.invitedEmail}`} onClick={() => setOpenInviteMenu(openInviteMenu === invitation.id ? null : invitation.id)} disabled={Boolean(pendingAction)}><MoreHorizontal aria-hidden="true" /></button>
                    {openInviteMenu === invitation.id ? (
                      <span className="family-settings-menu__panel">
                        <button type="button" onClick={() => void resendInvite(invitation)} disabled={Boolean(pendingAction)}>Send på nytt</button>
                        <button type="button" onClick={() => { setSheet({ type: "revoke-invite", invitation }); setOpenInviteMenu(null); }} disabled={Boolean(pendingAction)}>Trekk tilbake</button>
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </div>
            )) : <p className="family-settings__empty-text">Ingen invitasjoner ennå.</p>}
          </SettingsCard>
        </SettingsSection>
      ) : null}

      {sheet?.type === "family-name" ? <FamilyNameSheet name={family.name} isPending={pendingAction === "save-family-name"} onCancel={() => setSheet(null)} onSave={saveFamilyName} /> : null}
      {sheet?.type === "edit-member" ? <MemberEditSheet member={sheet.member} isPending={pendingAction === "edit-member"} onCancel={() => setSheet(null)} onSave={(displayName, role) => void saveMember(sheet.member, displayName, role)} /> : null}
      {sheet?.type === "remove-member" ? <RemoveSheet member={sheet.member} isSelf={sheet.member.id === currentMembership?.id} isPending={pendingAction === "remove-member"} onCancel={() => setSheet(null)} onRemove={() => void removeMember(sheet.member)} /> : null}
      {sheet?.type === "invite" ? <InviteSheet isPending={pendingAction === "send-invite"} onCancel={() => setSheet(null)} onSend={(email, role) => void sendInvite(email, role)} /> : null}
      {sheet?.type === "revoke-invite" ? <RevokeInviteSheet invitation={sheet.invitation} isPending={pendingAction === "revoke-invite"} onCancel={() => setSheet(null)} onRevoke={() => void revokeInvite(sheet.invitation)} /> : null}
    </FamilySettingsShell>
  );
}

function FamilySettingsShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="settings-shell settings-shell--detail family-settings" aria-labelledby="family-settings-title">
      <Link className="settings-back-link" href="/settings" aria-label="Tilbake til innstillinger">
        <ChevronLeft aria-hidden="true" />
      </Link>
      <header className="settings-hero settings-hero--detail">
        <h1 id="family-settings-title">Familie</h1>
      </header>
      {children}
    </main>
  );
}
