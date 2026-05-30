"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addFamilyMember,
  FamilyMember,
  getActiveFamilyId,
  getFamily,
  listFamilies,
  ManualFamilyMemberRole,
  removeFamilyMember,
  setActiveFamilyId
} from "../lib/api";
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
        let activeFamilyId = getActiveFamilyId();

        if (!activeFamilyId) {
          const families = await listFamilies();
          activeFamilyId = families[0]?.family.id ?? null;

          if (activeFamilyId) {
            setActiveFamilyId(activeFamilyId);
          }
        }

        if (!activeFamilyId) {
          router.push("/onboarding/create-family");
          return;
        }

        const details = await getFamily(activeFamilyId);

        if (isMounted) {
          setFamilyId(details.family.id);
          setMembers(details.members);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Could not load family members.");
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
      setError(addError instanceof Error ? addError.message : "Could not add family member.");
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
      setError(removeError instanceof Error ? removeError.message : "Could not remove family member.");
    }
  }

  return (
    <div className="members-form">
      {isLoading ? <p className="form-message">Loading family members…</p> : null}
      {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}

      <div className="members-form__fields">
        <label className="form-field">
          <span className="form-field__label">Name</span>
          <input
            className="form-field__input"
            name="memberName"
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            type="text"
            value={name}
          />
        </label>
        <label className="form-field">
          <span className="form-field__label">Role</span>
          <select className="form-field__input" name="memberRole" onChange={(event) => setRole(event.target.value as RoleOption)} value={role}>
            <option value="PARENT">Parent</option>
            <option value="CHILD">Child</option>
            <option value="GUEST">Guest</option>
          </select>
        </label>
      </div>

      <Button disabled={isAdding || isLoading || !familyId} onClick={addMember} variant="secondary">
        {isAdding ? "Adding…" : "Add member"}
      </Button>

      <ul className="member-list" aria-label="Family members">
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
              {member.role === "OWNER" ? "Owner" : "Remove"}
            </button>
          </li>
        ))}
      </ul>

      <Button disabled={isLoading || !familyId} onClick={() => router.push("/dashboard")} variant="primary">Continue</Button>
    </div>
  );
}

function formatRole(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
