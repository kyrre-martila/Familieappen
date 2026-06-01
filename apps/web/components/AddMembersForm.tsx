"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addFamilyMember,
  FamilyMember,
  getFamily,
  ManualFamilyMemberRole,
  removeFamilyMember
} from "../lib/api";
import { getUserFacingApiMessage, handleMissingOrInvalidAuth, loadAvailableFamilies } from "../lib/auth-family";
import { getOnboardingCompletionRoute } from "../lib/onboarding-completion";
import { Button } from "./ui";

type RoleOption = ManualFamilyMemberRole;

export function AddMembersForm() {
  const router = useRouter();
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleOption>("CHILD");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadFamily() {
      setError(null);

      try {
        const familyContext = await loadAvailableFamilies();

        if (familyContext.status === "unauthenticated") {
          router.push("/login");
          return;
        }

        if (familyContext.status === "no-family") {
          router.push("/onboarding/create-family");
          return;
        }

        if (familyContext.status === "pending") {
          setError("Du venter på godkjenning før du kan administrere familiemedlemmer.");
          return;
        }

        const details = await getFamily(familyContext.activeFamilyId);

        if (isMounted) {
          setFamilyId(details.family.id);
          setMembers(details.members);
        }
      } catch (loadError) {
        if (isMounted) {
          if (handleMissingOrInvalidAuth(loadError, router)) {
            setError(getUserFacingApiMessage(loadError, "Økten er utløpt. Logg inn på nytt."));
          } else {
            setError(getUserFacingApiMessage(loadError, "Kunne ikke laste familiemedlemmer."));
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadFamily();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function addMember() {
    const trimmedName = name.trim();

    if (!trimmedName || !familyId) {
      return;
    }

    setError(null);
    setIsAdding(true);

    try {
      const member = await addFamilyMember(familyId, { displayName: trimmedName, role });
      setMembers((currentMembers) => [...currentMembers, member]);
      setName("");
      setRole("CHILD");
    } catch (addError) {
      setError(getUserFacingApiMessage(addError, "Kunne ikke legge til familiemedlem."));
    } finally {
      setIsAdding(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!familyId) {
      return;
    }

    setError(null);

    try {
      await removeFamilyMember(familyId, memberId);
      setMembers((currentMembers) => currentMembers.filter((member) => member.id !== memberId));
    } catch (removeError) {
      setError(getUserFacingApiMessage(removeError, "Kunne ikke fjerne familiemedlem."));
    }
  }

  return (
    <div className="members-form">
      {isLoading ? <p className="form-message">Laster familiemedlemmer…</p> : null}
      {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}

      <div className="members-form__fields">
        <label className="form-field">
          <span className="form-field__label">Navn</span>
          <input
            className="form-field__input"
            name="memberName"
            onChange={(event) => setName(event.target.value)}
            placeholder="Navn"
            type="text"
            value={name}
          />
        </label>
        <label className="form-field">
          <span className="form-field__label">Rolle</span>
          <select className="form-field__input" name="memberRole" onChange={(event) => setRole(event.target.value as RoleOption)} value={role}>
            <option value="PARENT">Forelder</option>
            <option value="CHILD">Barn</option>
            <option value="GUEST">Gjest</option>
          </select>
        </label>
      </div>

      <Button disabled={isAdding || isLoading || !familyId} onClick={addMember} variant="secondary">
        {isAdding ? "Legger til…" : "Legg til medlem"}
      </Button>

      <ul className="member-list" aria-label="Familiemedlemmer">
        {members.map((member) => (
          <li className="member-list__item" key={member.id}>
            <span className="member-list__name">{member.displayName}</span>
            <span className="member-list__role">{formatRole(member.role)}</span>
            <button
              className="member-list__remove"
              disabled={member.role === "OWNER"}
              onClick={() => void removeMember(member.id)}
              type="button"
            >
              {member.role === "OWNER" ? "Eier" : "Fjern"}
            </button>
          </li>
        ))}
      </ul>

      <Button disabled={isLoading || !familyId} onClick={() => router.push(getOnboardingCompletionRoute())} variant="primary">Fortsett</Button>
    </div>
  );
}

function formatRole(role: string): string {
  switch (role) {
    case "OWNER":
      return "Eier";
    case "PARENT":
      return "Forelder";
    case "CHILD":
      return "Barn";
    case "GUEST":
      return "Gjest";
    default:
      return role;
  }
}
