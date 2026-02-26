import { Namespace, Context } from "@ory/keto-namespace-types";

/**
 * Subjects
 */
export class User implements Namespace {}

/**
 * Global role for platform-level admins (super users).
 * If you assign a user to GlobalRole:admin, they can do everything.
 */
export class GlobalRole implements Namespace {
  related: {
    members: User[];
  };

  permits = {
    // global superpower
    is_admin: (ctx: Context) => this.related.members.includes(ctx.subject),
  };
}

/**
 * Organization is your main "tenant" object.
 */
export class Organization implements Namespace {
  related: {
    owners: User[]; // highest within org
    admins: User[]; // org admins
    members: User[]; // normal members

    groups: Group[]; // groups belonging to this org
    roles: Role[];

    manage_users_roles: Role[];
    manage_groups_roles: Role[];
    manage_roles_roles: Role[];
    manage_org_roles: Role[]; // roles belonging to this org

    // (Optional) allow global admin to manage every org
    global_admins: GlobalRole[];
  };

  permits = {
    is_member: (ctx: Context) =>
      this.related.members.includes(ctx.subject) ||
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)),

    // Full admins OR custom roles with that permission
    manage_org: (ctx: Context) =>
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)) ||
      this.related.manage_org_roles.traverse((r) => r.permits.has(ctx)),

    manage_users: (ctx: Context) =>
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)) ||
      this.related.manage_users_roles.traverse((r) => r.permits.has(ctx)),

    manage_groups: (ctx: Context) =>
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)) ||
      this.related.manage_groups_roles.traverse((r) => r.permits.has(ctx)),

    manage_roles: (ctx: Context) =>
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)) ||
      this.related.manage_roles_roles.traverse((r) => r.permits.has(ctx)),

    // convenience (optional)
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

    // ADD: remove_member permission
    remove_member: (ctx: Context) =>
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)) ||
      this.related.manage_users_roles.traverse((r) => r.permits.has(ctx)),

    // ADD: invite_member permission (if different from manage_users)
    invite_member: (ctx: Context) =>
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)) ||
      this.related.manage_users_roles.traverse((r) => r.permits.has(ctx)),

    // ADD: view organization details
    view: (ctx: Context) => this.permits.is_member(ctx),
  };
}

/**
 * Groups belong to an org and contain users.
 * Org admins can manage any group in their org.
 */
export class Group implements Namespace {
  related: {
    org: Organization[];
    members: User[];
    managers: User[]; // optional group-level managers
    // ADD: roles that can manage this specific group
    manage_roles: Role[];
  };

  permits = {
    view: (ctx: Context) =>
      this.related.org.traverse((o) => o.permits.is_member(ctx)),

    manage: (ctx: Context) =>
      this.related.org.traverse((o) => o.permits.manage_groups(ctx)) ||
      this.related.managers.includes(ctx.subject) ||
      this.related.manage_roles.traverse((r) => r.permits.has(ctx)),

    // ADD: add_member to group
    add_member: (ctx: Context) => this.permits.manage(ctx),

    // ADD: remove_member from group
    remove_member: (ctx: Context) => this.permits.manage(ctx),

    // ADD: is_member check
    is_member: (ctx: Context) => this.related.members.includes(ctx.subject),
  };
}

/**
 * Roles belong to an org and contain users (members of the role).
 * You can later map per-role permissions too, but start simple.
 */
export class Role implements Namespace {
  related: {
    org: Organization[];
    members: User[];
    // ADD: groups that have this role
    groups: Group[];
  };

  permits = {
    // who is in this role
    has: (ctx: Context) =>
      this.related.members.includes(ctx.subject) ||
      this.related.groups.traverse((g) => g.permits.is_member(ctx)),

    // who can assign/remove members from this role
    manage_members: (ctx: Context) =>
      this.related.org.traverse((o) => o.permits.manage_roles(ctx)),

    // ADD: view role details
    view: (ctx: Context) =>
      this.related.org.traverse((o) => o.permits.is_member(ctx)),

    // ADD: delete role
    delete: (ctx: Context) =>
      this.related.org.traverse((o) => o.permits.manage_roles(ctx)),
  };
}
