import { Namespace, Context } from "@ory/keto-namespace-types";
import { User } from "./user";

/**
 * GlobalRole represents a platform-wide super-admin role.
 *
 * Any user added as a member of GlobalRole:admin can manage every
 * Organization, group, role, and project on the platform — including
 * accessing the IAM Admin Dashboard.
 *
 * ──────────────────────────────────────────────────────────────────────
 * Relationship write pattern
 * ──────────────────────────────────────────────────────────────────────
 *
 *   # Grant alice platform admin access
 *   POST /relation-tuples
 *   { "namespace": "GlobalRole", "object": "admin",
 *     "relation": "members", "subject_id": "alice" }
 *
 * ──────────────────────────────────────────────────────────────────────
 * Permission check example (IAM dashboard access gate)
 * ──────────────────────────────────────────────────────────────────────
 *
 *   GET /relation-tuples/check?namespace=GlobalRole
 *                             &object=admin
 *                             &relation=is_admin
 *                             &subject_id=alice
 */
export class GlobalRole implements Namespace {
  related: {
    /** Users who hold the global admin role. */
    members: User[];
  };

  permits = {
    /**
     * Top-level permission used by Organization, OrgGroup, and OrgRole
     * to short-circuit all other checks.
     * Also serves as the IAM Admin Dashboard access gate.
     */
    is_admin: (ctx: Context) => this.related.members.includes(ctx.subject),
  };
}
