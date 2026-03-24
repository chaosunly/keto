/**
 * Single-file namespace definition for Ory Keto.
 *
 * Keto's embedded TypeScript engine does not resolve cross-file imports, so all
 * namespace classes must live in this one self-contained file.
 * keto.yml points here: namespaces.location: file:///etc/keto/namespaces/config.ts
 */
import { Namespace, Context } from "@ory/keto-namespace-types";

/** Represents an individual platform user (identity from Ory Kratos). */
export class User implements Namespace {}

/** Platform-wide super-admin role. */
export class GlobalRole implements Namespace {
  related: {
    members: User[];
  };

  permits = {
    is_admin: (ctx: Context) => this.related.members.includes(ctx.subject),
  };
}

/** Group namespace used by the IAM app service layer. */
export class Group implements Namespace {
  related: {
    org: User[];
    admins: User[];
    members: User[];
  };

  permits = {
    is_member: (ctx: Context) =>
      this.related.admins.includes(ctx.subject) ||
      this.related.members.includes(ctx.subject),

    view_group: (ctx: Context) => this.permits.is_member(ctx),
    manage_group: (ctx: Context) => this.related.admins.includes(ctx.subject),
    add_members: (ctx: Context) => this.permits.manage_group(ctx),
    remove_members: (ctx: Context) => this.permits.manage_group(ctx),
  };
}

/** Named access level marker used by role bindings. */
export class Role implements Namespace {
  related: {
    groups: User[];
  };
}

/** GitLab-like group namespace. */
export class GitlabGroup implements Namespace {
  related: {
    admin_bindings: RoleBinding[];
    owner_bindings: RoleBinding[];
    maintainer_bindings: RoleBinding[];
    developer_bindings: RoleBinding[];
    reporter_bindings: RoleBinding[];
    guest_bindings: RoleBinding[];

    owner: User[];
    maintainer: User[];
    developer: User[];
    reporter: User[];
    guest: User[];

    parent: GitlabGroup[];
  };

  permits = {
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

    is_guest: (ctx: Context) =>
      this.related.guest_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.related.guest.includes(ctx.subject) ||
      this.permits.is_reporter(ctx) ||
      this.related.parent.traverse((g) => g.permits.is_guest(ctx)),

    is_member: (ctx: Context) => this.permits.is_guest(ctx),

    view: (ctx: Context) => this.permits.is_guest(ctx),
    create_project: (ctx: Context) => this.permits.is_developer(ctx),
    create_subgroup: (ctx: Context) => this.permits.is_maintainer(ctx),
    manage_settings: (ctx: Context) => this.permits.is_maintainer(ctx),
    manage_members: (ctx: Context) => this.permits.is_maintainer(ctx),
    delete: (ctx: Context) => this.permits.is_owner(ctx),
    edit: (ctx: Context) => this.permits.manage_settings(ctx),
    add_projects: (ctx: Context) => this.permits.create_project(ctx),
    transfer: (ctx: Context) => this.permits.is_admin(ctx),
  };
}

/** Intermediary binding from subjects/groups to role level on resources. */
export class RoleBinding implements Namespace {
  related: {
    subjects: User[];
    group_subjects: GitlabGroup[];
    role: Role[];
  };

  permits = {
    bound: (ctx: Context) =>
      this.related.subjects.includes(ctx.subject) ||
      this.related.group_subjects.traverse((g) => g.permits.is_guest(ctx)),
  };
}

/** GitLab-like project namespace. */
export class GitlabProject implements Namespace {
  related: {
    admin_bindings: RoleBinding[];
    owner_bindings: RoleBinding[];
    maintainer_bindings: RoleBinding[];
    developer_bindings: RoleBinding[];
    reporter_bindings: RoleBinding[];
    guest_bindings: RoleBinding[];

    owner: User[];
    maintainer: User[];
    developer: User[];
    reporter: User[];
    guest: User[];

    parent_group: GitlabGroup[];
    parent: User[];
  };

  permits = {
    is_admin: (ctx: Context) =>
      this.related.admin_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.related.parent_group.traverse((g) => g.permits.is_admin(ctx)),

    is_owner: (ctx: Context) =>
      this.related.owner_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.related.owner.includes(ctx.subject) ||
      this.permits.is_admin(ctx) ||
      this.related.parent_group.traverse((g) => g.permits.is_owner(ctx)),

    is_maintainer: (ctx: Context) =>
      this.related.maintainer_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.related.maintainer.includes(ctx.subject) ||
      this.permits.is_owner(ctx) ||
      this.related.parent_group.traverse((g) => g.permits.is_maintainer(ctx)),

    is_developer: (ctx: Context) =>
      this.related.developer_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.related.developer.includes(ctx.subject) ||
      this.permits.is_maintainer(ctx) ||
      this.related.parent_group.traverse((g) => g.permits.is_developer(ctx)),

    is_reporter: (ctx: Context) =>
      this.related.reporter_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.related.reporter.includes(ctx.subject) ||
      this.permits.is_developer(ctx) ||
      this.related.parent_group.traverse((g) => g.permits.is_reporter(ctx)),

    is_guest: (ctx: Context) =>
      this.related.guest_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.related.guest.includes(ctx.subject) ||
      this.permits.is_reporter(ctx) ||
      this.related.parent_group.traverse((g) => g.permits.is_guest(ctx)),

    view: (ctx: Context) => this.permits.is_guest(ctx),
    create_issue: (ctx: Context) => this.permits.is_guest(ctx),
    read_repository: (ctx: Context) => this.permits.is_reporter(ctx),
    download_artifacts: (ctx: Context) => this.permits.is_reporter(ctx),
    push_code: (ctx: Context) => this.permits.is_developer(ctx),
    manage_branches: (ctx: Context) => this.permits.is_developer(ctx),
    create_merge_request: (ctx: Context) => this.permits.is_developer(ctx),
    manage_pipelines: (ctx: Context) => this.permits.is_developer(ctx),
    manage_tags: (ctx: Context) => this.permits.is_developer(ctx),
    push_to_protected_branch: (ctx: Context) => this.permits.is_maintainer(ctx),
    merge_merge_request: (ctx: Context) => this.permits.is_maintainer(ctx),
    manage_settings: (ctx: Context) => this.permits.is_maintainer(ctx),
    manage_cicd: (ctx: Context) => this.permits.is_maintainer(ctx),
    manage_protected_branches: (ctx: Context) =>
      this.permits.is_maintainer(ctx),
    manage_members: (ctx: Context) => this.permits.is_maintainer(ctx),
    delete_project: (ctx: Context) => this.permits.is_owner(ctx),
    transfer_project: (ctx: Context) => this.permits.is_owner(ctx),
    change_namespace: (ctx: Context) => this.permits.is_owner(ctx),
    admin_override: (ctx: Context) => this.permits.is_admin(ctx),
    merge: (ctx: Context) => this.permits.create_merge_request(ctx),
    deploy: (ctx: Context) => this.permits.manage_pipelines(ctx),
    delete: (ctx: Context) => this.permits.delete_project(ctx),
    edit_settings: (ctx: Context) => this.permits.manage_settings(ctx),
    read_issues: (ctx: Context) => this.permits.view(ctx),
  };
}

/** Custom org role for delegated organization management. */
export class OrgRole implements Namespace {
  related: {
    org: Organization[];
    members: User[];
    groups: OrgGroup[];
  };

  permits = {
    has: (ctx: Context) =>
      this.related.members.includes(ctx.subject) ||
      this.related.groups.traverse((g) => g.permits.is_member(ctx)),

    manage_members: (ctx: Context) =>
      this.related.org.traverse((o) => o.permits.manage_roles(ctx)),

    view: (ctx: Context) =>
      this.related.org.traverse((o) => o.permits.is_member(ctx)),

    delete: (ctx: Context) =>
      this.related.org.traverse((o) => o.permits.manage_roles(ctx)),
  };
}

/** Org-level group namespace. */
export class OrgGroup implements Namespace {
  related: {
    org: Organization[];
    members: User[];
    managers: User[];
    manage_roles: OrgRole[];
  };

  permits = {
    view: (ctx: Context) =>
      this.related.org.traverse((o) => o.permits.is_member(ctx)),

    manage: (ctx: Context) =>
      this.related.org.traverse((o) => o.permits.manage_groups(ctx)) ||
      this.related.managers.includes(ctx.subject) ||
      this.related.manage_roles.traverse((r) => r.permits.has(ctx)),

    add_member: (ctx: Context) => this.permits.manage(ctx),
    remove_member: (ctx: Context) => this.permits.manage(ctx),
    is_member: (ctx: Context) => this.related.members.includes(ctx.subject),
  };
}

/** Top-level tenant namespace. */
export class Organization implements Namespace {
  related: {
    owners: User[];
    admins: User[];
    members: User[];

    groups: OrgGroup[];
    roles: OrgRole[];

    manage_users_roles: OrgRole[];
    manage_groups_roles: OrgRole[];
    manage_roles_roles: OrgRole[];
    manage_org_roles: OrgRole[];

    global_admins: GlobalRole[];
  };

  permits = {
    is_member: (ctx: Context) =>
      this.related.members.includes(ctx.subject) ||
      this.related.owners.includes(ctx.subject) ||
      this.related.admins.includes(ctx.subject) ||
      this.related.global_admins.traverse((r) => r.permits.is_admin(ctx)),

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

    view: (ctx: Context) => this.permits.is_member(ctx),
  };
}

/** Matrix homeserver organisation — top-level Matrix resource. */
export class MatrixOrg implements Namespace {
  related: {
    matrix_admin: User[];
    moderator: User[];
    support: User[];
    member: User[];
    viewer: User[];
  };

  permits = {
    is_matrix_admin: (ctx: Context) =>
      this.related.matrix_admin.includes(ctx.subject),

    is_moderator: (ctx: Context) =>
      this.related.moderator.includes(ctx.subject) ||
      this.permits.is_matrix_admin(ctx),

    is_support: (ctx: Context) =>
      this.related.support.includes(ctx.subject) ||
      this.permits.is_matrix_admin(ctx),

    is_member: (ctx: Context) =>
      this.related.member.includes(ctx.subject) ||
      this.permits.is_moderator(ctx) ||
      this.permits.is_support(ctx),

    is_viewer: (ctx: Context) =>
      this.related.viewer.includes(ctx.subject) ||
      this.permits.is_member(ctx),

    manage_users: (ctx: Context) => this.permits.is_matrix_admin(ctx),
    manage_roles: (ctx: Context) => this.permits.is_matrix_admin(ctx),
    manage_spaces: (ctx: Context) => this.permits.is_matrix_admin(ctx),
    manage_rooms: (ctx: Context) => this.permits.is_matrix_admin(ctx),

    view_audit: (ctx: Context) =>
      this.permits.is_matrix_admin(ctx) || this.permits.is_support(ctx),

    impersonate_support: (ctx: Context) => this.permits.is_support(ctx),
    view_content: (ctx: Context) => this.permits.is_viewer(ctx),
  };
}

/** Matrix space — a collection of rooms within a MatrixOrg. */
export class MatrixSpace implements Namespace {
  related: {
    matrix_admin: User[];
    moderator: User[];
    support: User[];
    member: User[];
    viewer: User[];
    parent: MatrixOrg[];
  };

  permits = {
    is_matrix_admin: (ctx: Context) =>
      this.related.matrix_admin.includes(ctx.subject) ||
      this.related.parent.traverse((o) => o.permits.is_matrix_admin(ctx)),

    is_moderator: (ctx: Context) =>
      this.related.moderator.includes(ctx.subject) ||
      this.permits.is_matrix_admin(ctx) ||
      this.related.parent.traverse((o) => o.permits.is_moderator(ctx)),

    is_support: (ctx: Context) =>
      this.related.support.includes(ctx.subject) ||
      this.permits.is_matrix_admin(ctx) ||
      this.related.parent.traverse((o) => o.permits.is_support(ctx)),

    is_member: (ctx: Context) =>
      this.related.member.includes(ctx.subject) ||
      this.permits.is_moderator(ctx) ||
      this.permits.is_support(ctx) ||
      this.related.parent.traverse((o) => o.permits.is_member(ctx)),

    is_viewer: (ctx: Context) =>
      this.related.viewer.includes(ctx.subject) ||
      this.permits.is_member(ctx) ||
      this.related.parent.traverse((o) => o.permits.is_viewer(ctx)),

    manage_users: (ctx: Context) =>
      this.permits.is_matrix_admin(ctx) || this.permits.is_moderator(ctx),

    manage_rooms: (ctx: Context) =>
      this.permits.is_matrix_admin(ctx) || this.permits.is_moderator(ctx),

    view_audit: (ctx: Context) =>
      this.permits.is_matrix_admin(ctx) || this.permits.is_support(ctx),

    view_content: (ctx: Context) => this.permits.is_viewer(ctx),
  };
}

/** Matrix room — an individual room within a MatrixSpace. */
export class MatrixRoom implements Namespace {
  related: {
    matrix_admin: User[];
    moderator: User[];
    support: User[];
    member: User[];
    viewer: User[];
    parent: MatrixSpace[];
  };

  permits = {
    is_matrix_admin: (ctx: Context) =>
      this.related.matrix_admin.includes(ctx.subject) ||
      this.related.parent.traverse((s) => s.permits.is_matrix_admin(ctx)),

    is_moderator: (ctx: Context) =>
      this.related.moderator.includes(ctx.subject) ||
      this.permits.is_matrix_admin(ctx) ||
      this.related.parent.traverse((s) => s.permits.is_moderator(ctx)),

    is_support: (ctx: Context) =>
      this.related.support.includes(ctx.subject) ||
      this.permits.is_matrix_admin(ctx) ||
      this.related.parent.traverse((s) => s.permits.is_support(ctx)),

    is_member: (ctx: Context) =>
      this.related.member.includes(ctx.subject) ||
      this.permits.is_moderator(ctx) ||
      this.permits.is_support(ctx) ||
      this.related.parent.traverse((s) => s.permits.is_member(ctx)),

    is_viewer: (ctx: Context) =>
      this.related.viewer.includes(ctx.subject) ||
      this.permits.is_member(ctx) ||
      this.related.parent.traverse((s) => s.permits.is_viewer(ctx)),

    manage_room: (ctx: Context) =>
      this.permits.is_matrix_admin(ctx) || this.permits.is_moderator(ctx),

    view_audit: (ctx: Context) =>
      this.permits.is_matrix_admin(ctx) ||
      this.related.parent.traverse((s) => s.permits.view_audit(ctx)),

    view_content: (ctx: Context) => this.permits.is_viewer(ctx),
  };
}
