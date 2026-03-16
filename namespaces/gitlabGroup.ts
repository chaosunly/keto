import { Namespace, Context } from "@ory/keto-namespace-types";
import { RoleBinding } from "./roleBinding";
import { User } from "./user";

/**
 * GitlabGroup mirrors GitLab's group concept — a namespace that contains
 * members, sub-groups, and projects.
 *
 * Access levels (highest → lowest):
 *   Admin (60) > Owner (50) > Maintainer (40) > Developer (30) > Reporter (20) > Guest (10)
 *
 * Each level inherits all permissions of every level below it.
 * Sub-groups optionally inherit the access level their parent grants.
 *
 * ──────────────────────────────────────────────────────────────────────
 * Relationship write patterns (Keto Write API)
 * ──────────────────────────────────────────────────────────────────────
 *
 *   # Alice is Admin of group "backend-team"
 *   { "namespace": "GitlabGroup", "object": "backend-team",
 *     "relation": "admin_bindings", "subject_id": "rb-alice-admin" }
 *   rolebinding:rb-alice-admin#subjects@user:alice
 *   rolebinding:rb-alice-admin#role@role:admin
 *
 *   # Bob is Owner of group "backend-team"
 *   { "namespace": "GitlabGroup", "object": "backend-team",
 *     "relation": "owner_bindings", "subject_id": "rb-bob-owner" }
 *
 *   # Group "mobile" is a sub-group of "backend-team"
 *   gitlabGroup:mobile#parent@gitlabGroup:backend-team
 *
 *   # All members of group "contractors" are Guests of "backend-team"
 *   rolebinding:rb1#group_subjects@gitlabGroup:contractors
 *   rolebinding:rb1#role@role:guest
 *   gitlabGroup:backend-team#guest_bindings@rolebinding:rb1
 */
export class GitlabGroup implements Namespace {
  related: {
    // ── Role bindings ──────────────────────────────────────────────────
    admin_bindings: RoleBinding[];
    owner_bindings: RoleBinding[];
    maintainer_bindings: RoleBinding[];
    developer_bindings: RoleBinding[];
    reporter_bindings: RoleBinding[];
    guest_bindings: RoleBinding[];

    // Legacy direct role assignments (used by iam-app service layer)
    owner: User[];
    maintainer: User[];
    developer: User[];
    reporter: User[];
    guest: User[];

    // ── Hierarchy ──────────────────────────────────────────────────────
    /**
     * Optional parent group. A user who holds any role in the parent
     * automatically holds the same role (or higher) in this sub-group.
     */
    parent: GitlabGroup[];
  };

  permits = {
    // ── Role-level checks (evaluated highest → lowest) ─────────────────

    /**
     * Platform/site-wide administrator.
     * Bypasses all resource-level checks and can manage any group.
     */
    is_admin: (ctx: Context) =>
      this.related.admin_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.related.parent.traverse((g) => g.permits.is_admin(ctx)),

    is_owner: (ctx: Context) =>
      this.related.owner_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.related.owner.includes(ctx.subject) ||
      this.permits.is_admin(ctx) ||
      this.related.parent.traverse((g) => g.permits.is_owner(ctx)),

    is_maintainer: (ctx: Context) =>
      this.related.maintainer_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.related.maintainer.includes(ctx.subject) ||
      this.permits.is_owner(ctx) ||
      this.related.parent.traverse((g) => g.permits.is_maintainer(ctx)),

    is_developer: (ctx: Context) =>
      this.related.developer_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.related.developer.includes(ctx.subject) ||
      this.permits.is_maintainer(ctx) ||
      this.related.parent.traverse((g) => g.permits.is_developer(ctx)),

    is_reporter: (ctx: Context) =>
      this.related.reporter_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.related.reporter.includes(ctx.subject) ||
      this.permits.is_developer(ctx) ||
      this.related.parent.traverse((g) => g.permits.is_reporter(ctx)),

    /**
     * is_guest is also the canonical "any member" check.
     * RoleBinding.group_subjects traverses this permit to determine whether
     * a context subject belongs to a group at any access level.
     */
    is_guest: (ctx: Context) =>
      this.related.guest_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.related.guest.includes(ctx.subject) ||
      this.permits.is_reporter(ctx) ||
      this.related.parent.traverse((g) => g.permits.is_guest(ctx)),

    // Compatibility alias used by app-level checks.
    is_member: (ctx: Context) => this.permits.is_guest(ctx),

    // ── Permission checks ──────────────────────────────────────────────

    /** Any member (guest+) can view the group and its projects list. */
    view: (ctx: Context) => this.permits.is_guest(ctx),

    /** Developers+ can create new projects inside this group. */
    create_project: (ctx: Context) => this.permits.is_developer(ctx),

    /** Maintainers+ can create sub-groups. */
    create_subgroup: (ctx: Context) => this.permits.is_maintainer(ctx),

    /** Maintainers+ can edit group settings, webhooks, and integrations. */
    manage_settings: (ctx: Context) => this.permits.is_maintainer(ctx),

    /** Maintainers+ can invite, remove, or change the role of group members. */
    manage_members: (ctx: Context) => this.permits.is_maintainer(ctx),

    /** Owners+ can delete the group and all its contents. */
    delete: (ctx: Context) => this.permits.is_owner(ctx),

    // Legacy aliases to match iam-app permission checks.
    edit: (ctx: Context) => this.permits.manage_settings(ctx),
    add_projects: (ctx: Context) => this.permits.create_project(ctx),

    /**
     * Admin only — transfer group to another namespace or change
     * platform-level visibility settings.
     */
    transfer: (ctx: Context) => this.permits.is_admin(ctx),
  };
}
