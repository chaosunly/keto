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
    owners: User[];   // highest within org
    admins: User[];   // org admins
    members: User[];  // normal members

    groups: Group[];  // groups belonging to this org
    roles: Role[];
    
    manage_users_roles: Role[];
    manage_groups_roles: Role[];
    manage_roles_roles: Role[];
    manage_org_roles: Role[];// roles belonging to this org

    // (Optional) allow global admin to manage every org
    global_admins: GlobalRole[];
  };

  private isGlobalAdmin(ctx: Context): boolean {
    // If you create a single object like GlobalRole:admin
    // and add global admins to it, you can reference it here.
    return this.related.global_admins.traverse((r) => r.permits.is_admin(ctx));
  }

  private isOrgAdmin(ctx: Context): boolean {
    return (
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.isGlobalAdmin(ctx)
    );
  }

  private anyRoleMember(ctx: Context, roles: Role[]): boolean {
    return roles.traverse((r) => r.permits.has(ctx));
  }

  permits = {
    is_member: (ctx: Context) =>
      this.related.members.includes(ctx.subject) || this.isOrgAdmin(ctx),

    // Full admins OR custom roles with that permission
    manage_org: (ctx: Context) =>
      this.isOrgAdmin(ctx) || this.anyRoleMember(ctx, this.related.manage_org_roles),

    manage_users: (ctx: Context) =>
      this.isOrgAdmin(ctx) || this.anyRoleMember(ctx, this.related.manage_users_roles),

    manage_groups: (ctx: Context) =>
      this.isOrgAdmin(ctx) || this.anyRoleMember(ctx, this.related.manage_groups_roles),

    manage_roles: (ctx: Context) =>
      this.isOrgAdmin(ctx) || this.anyRoleMember(ctx, this.related.manage_roles_roles),

    // convenience (optional)
    create_group: (ctx: Context) =>
      this.isOrgAdmin(ctx) || this.anyRoleMember(ctx, this.related.manage_groups_roles),

    create_role: (ctx: Context) =>
      this.isOrgAdmin(ctx) || this.anyRoleMember(ctx, this.related.manage_roles_roles),

    assign_role: (ctx: Context) =>
      this.isOrgAdmin(ctx) || this.anyRoleMember(ctx, this.related.manage_roles_roles),
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
  };

  private orgAllows(ctx: Context, perm: keyof Organization["permits"]): boolean {
    return this.related.org.traverse((o) => o.permits[perm](ctx));
  }

  permits = {
    view: (ctx: Context) => this.orgAllows(ctx, "is_member"),
    manage: (ctx: Context) =>
      this.orgAllows(ctx, "manage_groups") || this.related.managers.includes(ctx.subject),
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
  };

  private orgAllows(ctx: Context, perm: keyof Organization["permits"]): boolean {
    return this.related.org.traverse((o) => o.permits[perm](ctx));
  }

  permits = {
    // who is in this role
    has: (ctx: Context) => this.related.members.includes(ctx.subject),

    // who can assign/remove members from this role
    manage_members: (ctx: Context) => this.orgAllows(ctx, "manage_roles"),
  };
}