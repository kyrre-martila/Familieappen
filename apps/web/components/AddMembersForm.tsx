"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

type Role = "Parent" | "Child";

interface FamilyMember {
  id: number;
  name: string;
  role: Role;
}

const initialMembers: FamilyMember[] = [
  { id: 1, name: "Elisabeth", role: "Parent" },
  { id: 2, name: "Even-Olai", role: "Child" },
  { id: 3, name: "Fiona", role: "Child" },
  { id: 4, name: "Alma", role: "Child" }
];

export function AddMembersForm() {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("Child");
  const nextId = useMemo(() => Math.max(0, ...members.map((member) => member.id)) + 1, [members]);

  function addMember() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    setMembers((currentMembers) => [...currentMembers, { id: nextId, name: trimmedName, role }]);
    setName("");
    setRole("Child");
  }

  return (
    <div className="members-form">
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
          <select className="form-field__input" name="memberRole" onChange={(event) => setRole(event.target.value as Role)} value={role}>
            <option>Parent</option>
            <option>Child</option>
          </select>
        </label>
      </div>

      <Button onClick={addMember} variant="secondary">Add member</Button>

      <ul className="member-list" aria-label="Family members">
        {members.map((member) => (
          <li className="member-list__item" key={member.id}>
            <span className="member-list__name">{member.name}</span>
            <span className="member-list__role">{member.role}</span>
            <button
              className="member-list__remove"
              onClick={() => setMembers((currentMembers) => currentMembers.filter((currentMember) => currentMember.id !== member.id))}
              type="button"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <Button onClick={() => router.push("/dashboard")} variant="primary">Continue</Button>
    </div>
  );
}
