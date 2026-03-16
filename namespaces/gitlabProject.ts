import { Namespace, Context } from "@ory/keto-namespace-types";
import { RoleBinding } from "./roleBinding";
import { GitlabGroup } from "./gitlabGroup";

/**
 * GitlabProject mirrors GitLab's project concept — a single repository with
 * issues, merge requests, CI/CD pipelines, and a wiki.
 *
 * Access levels (highest → lowest):
 *   Admin (60) > Owner (50) > Maintainer (40) > Developer (30) > Reporter (20) > Guest (10)
 *
 * Each level inherits all permissions of every level below it.
 * When no direct binding matches, access falls through to the parent
 * group's access level for the requesting user.
 *
 * ──────────────────────────────────────────────────────────────────────
 * Relationship write patterns (Keto Write API)
 * ──────────────────────────────────────────────────────────────────────
 *
 *   # Alice is Admin of project "payment-api"
 *   POST /relation-tuples
 *   { "namespace": "GitlabProject", "object": "payment-api",
 *     "relation": "admin_bindings", "subject_id": "rb-alice-admin" }
 *   rolebinding:rb-alice-admin#subjects@user:alice
 *   rolebinding:rb-alice-admin#role@role:admin
 *
 *   # Bob is Maintainer on project "payment-api" (direct user)
 *   { "namespace": "GitlabProject", "object": "payment-api",
 *     "relation": "maintainer_bindings", "subject_id": "rb-bob-maintainer" }
 *
 *   # All members of group "frontend" are Reporters on "payment-api"
 *   rolebinding:rb2#group_subjects@gitlabGroup:frontend
 *   rolebinding:rb2#role@role:reporter
 *   { "namespace": "GitlabProject", "object": "payment-api",
 *     "relation": "reporter_bindings", "subject_id": "rb2" }
 *
 *   # Project "payment-api" lives under group "backend-team"
 *   { "namespace": "GitlabProject", "object": "payment-api",
 *     "relation": "parent_group", "subject_id": "gitlabGroup:backend-team" }
 *
 * ──────────────────────────────────────────────────────────────────────
 * Permission check example (Keto Check API)
 * ──────────────────────────────────────────────────────────────────────
 *
 *   Check if alice can push code to payment-api:
 *   GET /relation-tuples/check?namespace=GitlabProject
 *                             &object=payment-api
 *                             &relation=push_code
 *                             &subject_id=alice
 */
export class GitlabProject implements Namespace {
  related: {
    // ── Role bindings ──────────────────────────────────────────────────
    admin_bindings: RoleBinding[];
    owner_bindings: RoleBinding[];
    maintainer_bindings: RoleBinding[];
    developer_bindings: RoleBinding[];
    reporter_bindings: RoleBinding[];
    guest_bindings: RoleBinding[];

    // ── Hierarchy ──────────────────────────────────────────────────────
    /**
     * The group this project belongs to. Users with any role in the parent
     * group inherit that same (or higher) role on the project.
     *
     * Keto tuple: GitlabProject:payment-api#parent_group@GitlabGroup:backend-team
     */
    parent_group: GitlabGroup[];
  };

  permits = {
    // ── Role-level checks (evaluated highest → lowest) ─────────────────

    /**
     * Platform/site-wide administrator.
     * Bypasses all resource-level checks; can manage any project.
     */
    is_admin: (ctx: Context) =>
      this.related.admin_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.related.parent_group.traverse((g) => g.permits.is_admin(ctx)),

    is_owner: (ctx: Context) =>
      this.related.owner_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.permits.is_admin(ctx) ||
      this.related.parent_group.traverse((g) => g.permits.is_owner(ctx)),

    is_maintainer: (ctx: Context) =>
      this.related.maintainer_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.permits.is_owner(ctx) ||
      this.related.parent_group.traverse((g) => g.permits.is_maintainer(ctx)),

    is_developer: (ctx: Context) =>
      this.related.developer_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.permits.is_maintainer(ctx) ||
      this.related.parent_group.traverse((g) => g.permits.is_developer(ctx)),

    is_reporter: (ctx: Context) =>
      this.related.reporter_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.permits.is_developer(ctx) ||
      this.related.parent_group.traverse((g) => g.permits.is_reporter(ctx)),

    is_guest: (ctx: Context) =>
      this.related.guest_bindings.traverse((b) => b.permits.bound(ctx)) ||
      this.permits.is_reporter(ctx) ||
      this.related.parent_group.traverse((g) => g.permits.is_guest(ctx)),

    // ── Permission checks mapped to GitLab access levels ───────────────

    // Guest (10) ──────────────────────────────────────────────────────

    /** Any member can view the project, browse issues, and the wiki. */
    view: (ctx: Context) => this.permits.is_guest(ctx),

    /** Guests can create issues and post comments. */
    create_issue: (ctx: Context) => this.permits.is_guest(ctx),

    // Reporter (20) ───────────────────────────────────────────────────

    /** Reporters can browse the full repository tree and commit history. */
    read_repository: (ctx: Context) => this.permits.is_reporter(ctx),

    /** Reporters can download job artifacts from CI/CD pipelines. */
    download_artifacts: (ctx: Context) => this.permits.is_reporter(ctx),

    // Developer (30) ──────────────────────────────────────────────────

    /** Developers can push commits to non-protected branches. */
    push_code: (ctx: Context) => this.permits.is_developer(ctx),

    /** Developers can create and delete branches. */
    manage_branches: (ctx: Context) => this.permits.is_developer(ctx),

    /** Developers can open and update merge requests. */
    create_merge_request: (ctx: Context) => this.permits.is_developer(ctx),

    /** Developers can trigger, retry, and cancel CI/CD pipelines. */
    manage_pipelines: (ctx: Context) => this.permits.is_developer(ctx),

    /** Developers can create and delete tags. */
    manage_tags: (ctx: Context) => this.permits.is_developer(ctx),

    // Maintainer (40) ─────────────────────────────────────────────────

    /** Maintainers can push commits to protected branches. */
    push_to_protected_branch: (ctx: Context) => this.permits.is_maintainer(ctx),

    /** Maintainers can approve and merge merge requests. */
    merge_merge_request: (ctx: Context) => this.permits.is_maintainer(ctx),

    /** Maintainers can manage project settings, webhooks, and integrations. */
    manage_settings: (ctx: Context) => this.permits.is_maintainer(ctx),

    /** Maintainers can manage CI/CD variables, runners, and environments. */
    manage_cicd: (ctx: Context) => this.permits.is_maintainer(ctx),

    /** Maintainers can configure branch protection rules. */
    manage_protected_branches: (ctx: Context) =>
      this.permits.is_maintainer(ctx),

    // Owner (50) ──────────────────────────────────────────────────────

    /** Owners can add, remove, or change the role of project members. */
    manage_members: (ctx: Context) => this.permits.is_owner(ctx),

    /** Owners can archive or permanently delete the project. */
    delete_project: (ctx: Context) => this.permits.is_owner(ctx),

    /** Owners can transfer the project to a different group or namespace. */
    transfer_project: (ctx: Context) => this.permits.is_owner(ctx),

    /** Owners can rename the project or change its visibility (public/private). */
    change_namespace: (ctx: Context) => this.permits.is_owner(ctx),

    // Admin (60) ──────────────────────────────────────────────────────

    /**
     * Admin only — force-delete a project regardless of group settings,
     * or perform platform-level overrides (e.g. unlock a protected branch
     * system-wide, bypass merge approvals).
     */
    admin_override: (ctx: Context) => this.permits.is_admin(ctx),
  };
}
