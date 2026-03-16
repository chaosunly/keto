import { Namespace, Context } from "@ory/keto-namespace-types";
import { User } from "./user";
import { GlobalRole } from "./globalRole";

/**
 * OrgRole — a custom role that belongs to an Organization.
 *
 * OrgRoles let org admins grant fine-grained management permissions
 * (manage users, groups, etc.) to specific users or org groups without
 * making them a full org admin.
 *
 * Note: "OrgRole" (platform IAM custom role) is intentionally distinct
 * from "Role" in role.ts (GitLab access-level marker).
 */
export class OrgRole implements Namespace {
  related: {
    /** The organization this custom role belongs to. */
    org: Organization[];
    /** Individual users assigned to this role. */
    members: User[];
    /** OrgGroups whose members inherit this role. */
    groups: OrgGroup[];
  };

  permits = {
    /** True when the subject holds this role (directly or via an org group). */
    has: (ctx: Context) =>
      this.related.members.includes(ctx.subject) ||
      this.related.groups.traverse((g) => g.permits.is_member(ctx)),

    /** Org admins and global admins can modify role membership. */
    manage_members: (ctx: Context) =>
      this.related.org.traverse((o) => o.permits.manage_roles(ctx)),

    /** Any org member can view role details. */
    view: (ctx: Context) =>
      this.related.org.traverse((o) => o.permits.is_member(ctx)),

    /** Only users with manage_roles permission can delete a role. */
    delete: (ctx: Context) =>
      this.related.org.traverse((o) => o.permits.manage_roles(ctx)),
  };
}

/**
 * OrgGroup — a group that belongs to an Organization.
 *
 * OrgGroups are used to batch-assign users to OrgRoles and organization
 * permissions. They are distinct from GitlabGroup (keto/gitlabGroup.ts)
 * which governs repository-level access.
 */
export class OrgGroup implements Namespace {
  related: {
    /** The organization this group belongs to. */
    org: Organization[];
    /** Individual users who are members of this group. */
    members: User[];
    /** Users who can manage this group's membership. */
    managers: User[];
    /** OrgRoles that grant management rights over this group. */
    manage_roles: OrgRole[];
  };

  permits = {
    /** Any org member can view the group. */
    view: (ctx: Context) =>
      this.related.org.traverse((o) => o.permits.is_member(ctx)),

    /** Group managers, org admins, and global admins can manage the group. */
    manage: (ctx: Context) =>
      this.related.org.traverse((o) => o.permits.manage_groups(ctx)) ||
      this.related.managers.includes(ctx.subject) ||
      this.related.manage_roles.traverse((r) => r.permits.has(ctx)),

    /** Anyone who can manage the group can add members. */
    add_member: (ctx: Context) => this.permits.manage(ctx),

    /** Anyone who can manage the group can remove members. */
    remove_member: (ctx: Context) => this.permits.manage(ctx),

    /** Used by OrgRole to check group membership for role inheritance. */
    is_member: (ctx: Context) => this.related.members.includes(ctx.subject),
  };
}

/**
 * Organization — the top-level tenant object in the IAM platform.
 *
 * An organization contains users, groups, and custom roles.
 * Org owners and admins can manage all resources inside their org.
 * Global admins (from GlobalRole) can manage every organization.
 *
 * ──────────────────────────────────────────────────────────────────────
 * Relationship write patterns
 * ──────────────────────────────────────────────────────────────────────
 *
 *   # Add alice as an org owner
 *   POST /relation-tuples
 *   { "namespace": "Organization", "object": "acme-corp",
 *     "relation": "owners", "subject_id": "alice" }
 *
 *   # Add bob as a regular member
 *   { "namespace": "Organization", "object": "acme-corp",
 *     "relation": "members", "subject_id": "bob" }
 *
 *   # Grant a custom role the ability to manage users in the org
 *   { "namespace": "Organization", "object": "acme-corp",
 *     "relation": "manage_users_roles", "subject_id": "orgRole:user-manager" }
 *
 *   # Allow global admins to manage this org
 *   { "namespace": "Organization", "object": "acme-corp",
 *     "relation": "global_admins", "subject_id": "globalRole:admin" }
 *
 * ──────────────────────────────────────────────────────────────────────
 * Permission check example (IAM dashboard — "can alice manage users?")
 * ──────────────────────────────────────────────────────────────────────
 *
 *   GET /relation-tuples/check?namespace=Organization
 *                             &object=acme-corp
 *                             &relation=manage_users
 *                             &subject_id=alice
 */
export class Organization implements Namespace {
  related: {
    // ── Direct role assignments ────────────────────────────────────────
    /** Highest authority within the org. */
    owners: User[];
    /** Org-level admins (below owner). */
    admins: User[];
    /** Regular org members. */
    members: User[];

    // ── Child resources ────────────────────────────────────────────────
    /** OrgGroups that belong to this organization. */
    groups: OrgGroup[];
    /** Custom OrgRoles that belong to this organization. */
    roles: OrgRole[];

    // ── Delegated permission roles ─────────────────────────────────────
    /** OrgRoles whose holders can manage org users. */
    manage_users_roles: OrgRole[];
    /** OrgRoles whose holders can manage org groups. */
    manage_groups_roles: OrgRole[];
    /** OrgRoles whose holders can manage org roles. */
    manage_roles_roles: OrgRole[];
    /** OrgRoles whose holders can manage org-level settings. */
    manage_org_roles: OrgRole[];

    // ── Platform-level override ────────────────────────────────────────
    /**
     * GlobalRole instances linked here so that global admins can
     * manage every organization without being explicitly added as owners.
     *
     * Keto tuple:
     * Organization:acme-corp#global_admins@GlobalRole:admin
     */
    global_admins: GlobalRole[];
  };

  permits = {
    /** True for any user who belongs to the org at any level. */
    is_member: (ctx: Context) =>
      this.related.members.includes(ctx.subject) ||
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)),

    /** Manage org-level settings (name, billing, SSO, etc.). */
    manage_org: (ctx: Context) =>
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)) ||
      this.related.manage_org_roles.traverse((r) => r.permits.has(ctx)),

    /** Add, remove, or change roles of org members. */
    manage_users: (ctx: Context) =>
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)) ||
      this.related.manage_users_roles.traverse((r) => r.permits.has(ctx)),

    /** Create, update, or delete org groups. */
    manage_groups: (ctx: Context) =>
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)) ||
      this.related.manage_groups_roles.traverse((r) => r.permits.has(ctx)),

    /** Create, update, or delete org roles. */
    manage_roles: (ctx: Context) =>
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)) ||
      this.related.manage_roles_roles.traverse((r) => r.permits.has(ctx)),

    create_group: (ctx: Context) =>
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)) ||
      this.related.manage_groups_roles.traverse((r) => r.permits.has(ctx)),

    create_role: (ctx: Context) =>
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)) ||
      this.related.manage_roles_roles.traverse((r) => r.permits.has(ctx)),

    assign_role: (ctx: Context) =>
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)) ||
      this.related.manage_roles_roles.traverse((r) => r.permits.has(ctx)),

    remove_member: (ctx: Context) =>
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)) ||
      this.related.manage_users_roles.traverse((r) => r.permits.has(ctx)),

    invite_member: (ctx: Context) =>
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)) ||
      this.related.manage_users_roles.traverse((r) => r.permits.has(ctx)),

    /** Any org member can view org details. */
    view: (ctx: Context) => this.permits.is_member(ctx),
  };
}
