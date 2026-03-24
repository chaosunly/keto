import { Namespace, Context } from "@ory/keto-namespace-types";
import { User } from "./user";
import { MatrixSpace } from "./matrixSpace";

/**
 * MatrixRoom represents an individual Element Matrix room within a MatrixSpace.
 *
 * Roles at room scope follow the same hierarchy as MatrixOrg and MatrixSpace.
 * Users who hold a role at the space level automatically inherit the equivalent
 * role here via the `parent` relation (which in turn inherits from the org).
 *
 * This creates a three-level inheritance chain:
 *   MatrixOrg → MatrixSpace → MatrixRoom
 *
 * ──────────────────────────────────────────────────────────────────────
 * Relationship write patterns (Keto Write API)
 * ──────────────────────────────────────────────────────────────────────
 *
 *   # Grant dave member role directly on room "announcements"
 *   PUT /admin/relation-tuples
 *   { "namespace": "MatrixRoom", "object": "room-cuid-001",
 *     "relation": "member", "subject_id": "dave" }
 *
 *   # Link room "announcements" to its parent space
 *   { "namespace": "MatrixRoom", "object": "room-cuid-001",
 *     "relation": "parent", "subject_set": { "namespace": "MatrixSpace", "object": "space-cuid-001", "relation": "" } }
 *
 * ──────────────────────────────────────────────────────────────────────
 * Permission check example (Keto Check API)
 * ──────────────────────────────────────────────────────────────────────
 *
 *   Check if dave can view content in room "room-cuid-001":
 *   GET /relation-tuples/check?namespace=MatrixRoom
 *                             &object=room-cuid-001
 *                             &relation=view_content
 *                             &subject_id=dave
 */
export class MatrixRoom implements Namespace {
  related: {
    /** Admins scoped to this room (plus inheritance from parent space/org). */
    matrix_admin: User[];
    /** Moderators for this room. */
    moderator: User[];
    /** Support staff for this room. */
    support: User[];
    /** Members of this room. */
    member: User[];
    /** Read-only viewers of this room. */
    viewer: User[];

    /**
     * Parent MatrixSpace. Users with any role in the parent space (or the
     * space's parent org) automatically inherit the equivalent role on this room.
     *
     * Keto tuple: MatrixRoom:<id>#parent@MatrixSpace:<spaceId>
     */
    parent: MatrixSpace[];
  };

  permits = {
    // ── Role-level checks (with parent space/org inheritance) ──────────

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

    // ── Permission checks ──────────────────────────────────────────────

    /** Manage this room's settings, topic, and membership. */
    manage_room: (ctx: Context) =>
      this.permits.is_matrix_admin(ctx) || this.permits.is_moderator(ctx),

    /** Access audit logs scoped to this room. */
    view_audit: (ctx: Context) =>
      this.permits.is_matrix_admin(ctx) ||
      this.related.parent.traverse((s) => s.permits.view_audit(ctx)),

    /** Read messages and content in this room. */
    view_content: (ctx: Context) => this.permits.is_viewer(ctx),
  };
}
