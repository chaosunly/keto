import { Namespace, Context } from "@ory/keto-namespace-types";
import { User } from "./user";
import { MatrixOrg } from "./matrixOrg";

/**
 * MatrixSpace represents an Element Matrix space — a collection of rooms
 * within a MatrixOrg.
 *
 * Roles at space scope follow the same hierarchy as MatrixOrg. Users who hold
 * a role at the org level automatically inherit the equivalent role here via
 * the `parent` relation.
 *
 * Space-level moderators additionally gain manage_users and manage_rooms
 * permissions that are limited to this space's scope (not org-wide).
 *
 * ──────────────────────────────────────────────────────────────────────
 * Relationship write patterns (Keto Write API)
 * ──────────────────────────────────────────────────────────────────────
 *
 *   # Grant carol moderator role on space "general"
 *   PUT /admin/relation-tuples
 *   { "namespace": "MatrixSpace", "object": "space-cuid-001",
 *     "relation": "moderator", "subject_id": "carol" }
 *
 *   # Link space "general" to its parent org "acme"
 *   { "namespace": "MatrixSpace", "object": "space-cuid-001",
 *     "relation": "parent", "subject_set": { "namespace": "MatrixOrg", "object": "acme", "relation": "" } }
 *
 * ──────────────────────────────────────────────────────────────────────
 * Permission check example (Keto Check API)
 * ──────────────────────────────────────────────────────────────────────
 *
 *   Check if carol can manage rooms in space "space-cuid-001":
 *   GET /relation-tuples/check?namespace=MatrixSpace
 *                             &object=space-cuid-001
 *                             &relation=manage_rooms
 *                             &subject_id=carol
 */
export class MatrixSpace implements Namespace {
  related: {
    /** Admins scoped to this space (plus inheritance from parent org). */
    matrix_admin: User[];
    /** Moderators for this space. */
    moderator: User[];
    /** Support staff for this space. */
    support: User[];
    /** Members of this space. */
    member: User[];
    /** Read-only viewers of this space. */
    viewer: User[];

    /**
     * Parent MatrixOrg. Users with any role in the parent org automatically
     * inherit the equivalent role on this space.
     *
     * Keto tuple: MatrixSpace:<id>#parent@MatrixOrg:<orgId>
     */
    parent: MatrixOrg[];
  };

  permits = {
    // ── Role-level checks (with parent org inheritance) ────────────────

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

    // ── Permission checks ──────────────────────────────────────────────

    /** Manage member access within this space. */
    manage_users: (ctx: Context) =>
      this.permits.is_matrix_admin(ctx) || this.permits.is_moderator(ctx),

    /** Create, update, or delete rooms within this space. */
    manage_rooms: (ctx: Context) =>
      this.permits.is_matrix_admin(ctx) || this.permits.is_moderator(ctx),

    /** Access audit logs scoped to this space. */
    view_audit: (ctx: Context) =>
      this.permits.is_matrix_admin(ctx) || this.permits.is_support(ctx),

    /** Read space content (room list, messages). */
    view_content: (ctx: Context) => this.permits.is_viewer(ctx),
  };
}
