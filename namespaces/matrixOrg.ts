import { Namespace, Context } from "@ory/keto-namespace-types";
import { User } from "./user";

/**
 * MatrixOrg is the top-level Matrix resource — an Element/Matrix homeserver
 * organisation managed by the IAM platform.
 *
 * Roles (highest → lowest):
 *   matrix_admin > moderator / support > member > viewer
 *
 *   matrix_admin  – Full org-level control: manage users, spaces, rooms, and roles.
 *   moderator     – Can moderate content and manage users at space/room scope.
 *   support       – Read-only audit access + support impersonation capability.
 *   member        – Regular org member; can view content.
 *   viewer        – Read-only access; cannot interact.
 *
 * Note: moderator and support are parallel branches — neither inherits from the
 * other. Both inherit from matrix_admin above them and grant member access below.
 *
 * ──────────────────────────────────────────────────────────────────────
 * Relationship write patterns (Keto Write API)
 * ──────────────────────────────────────────────────────────────────────
 *
 *   # Grant alice matrix_admin on org "acme"
 *   PUT /admin/relation-tuples
 *   { "namespace": "MatrixOrg", "object": "acme",
 *     "relation": "matrix_admin", "subject_id": "alice" }
 *
 *   # Grant bob support role on org "acme"
 *   { "namespace": "MatrixOrg", "object": "acme",
 *     "relation": "support", "subject_id": "bob" }
 *
 * ──────────────────────────────────────────────────────────────────────
 * Permission check example (Keto Check API)
 * ──────────────────────────────────────────────────────────────────────
 *
 *   Check if alice can manage users in org "acme":
 *   GET /relation-tuples/check?namespace=MatrixOrg
 *                             &object=acme
 *                             &relation=manage_users
 *                             &subject_id=alice
 */
export class MatrixOrg implements Namespace {
  related: {
    /** Full org administrators. */
    matrix_admin: User[];
    /** Content moderators — can manage users and rooms at space/room scope. */
    moderator: User[];
    /** Support staff — audit access + impersonation capability. */
    support: User[];
    /** Regular org members. */
    member: User[];
    /** Read-only viewers. */
    viewer: User[];
  };

  permits = {
    // ── Role-level checks ──────────────────────────────────────────────

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

    // ── Permission checks ──────────────────────────────────────────────

    /** Add, remove, or update org member accounts. */
    manage_users: (ctx: Context) => this.permits.is_matrix_admin(ctx),

    /** Assign or revoke Matrix roles within this org. */
    manage_roles: (ctx: Context) => this.permits.is_matrix_admin(ctx),

    /** Create, update, or delete spaces under this org. */
    manage_spaces: (ctx: Context) => this.permits.is_matrix_admin(ctx),

    /** Create, update, or delete rooms under any space in this org. */
    manage_rooms: (ctx: Context) => this.permits.is_matrix_admin(ctx),

    /** Access org-level audit logs. */
    view_audit: (ctx: Context) =>
      this.permits.is_matrix_admin(ctx) || this.permits.is_support(ctx),

    /**
     * Initiate a support impersonation session for a user within this org.
     * Only support-role holders (and matrix_admin who inherit support) may use this.
     */
    impersonate_support: (ctx: Context) => this.permits.is_support(ctx),

    /** Read org content (rooms, messages, member list). */
    view_content: (ctx: Context) => this.permits.is_viewer(ctx),
  };
}
