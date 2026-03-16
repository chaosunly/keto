import { Namespace, Context } from "@ory/keto-namespace-types";
import { User } from "./user";
import { GitlabGroup } from "./gitlabGroup";
import { Role } from "./role";

/**
 * RoleBinding is the intermediary object that ties a set of subjects
 * (individual users or all members of a group) to a resource at a
 * given role level.
 *
 * The role level is NOT stored as a permit here — it is encoded on the
 * resource side by placing this binding in the correct "*_bindings"
 * relation on a Group or Project:
 *
 *   project:<id>#developer_bindings@rolebinding:<id>
 *   group:<id>#maintainer_bindings@rolebinding:<id>
 *
 * The optional `role` relation is a metadata tag for reverse lookups
 * ("which role does this binding grant?") and is not used for enforcement.
 *
 * ──────────────────────────────────────────────────────────────────────
 * Relationship write patterns
 * ──────────────────────────────────────────────────────────────────────
 *
 *   # Alice is a Developer on project "payment-api" (direct user)
 *   rolebinding:rb1#subjects@user:alice
 *   rolebinding:rb1#role@role:developer
 *   gitlabProject:payment-api#developer_bindings@rolebinding:rb1
 *
 *   # All members of group "frontend" are Reporters on "payment-api"
 *   rolebinding:rb2#group_subjects@gitlabGroup:frontend
 *   rolebinding:rb2#role@role:reporter
 *   gitlabProject:payment-api#reporter_bindings@rolebinding:rb2
 *
 * ──────────────────────────────────────────────────────────────────────
 * Circular dependency note
 * ──────────────────────────────────────────────────────────────────────
 * roleBinding.ts → GitlabGroup (for group_subjects membership traversal)
 * gitlabGroup.ts → RoleBinding (for *_bindings relations)
 *
 * This mutual import is valid in Keto OPL — the Keto runtime evaluator
 * resolves the graph lazily and handles cycles correctly.
 */
export class RoleBinding implements Namespace {
  related: {
    /** Individual users directly covered by this binding. */
    subjects: User[];

    /**
     * Groups whose members are included in this binding.
     * Any user who satisfies gitlabGroup.permits.is_guest() — i.e. any member
     * at any access level — will pass the `bound` check.
     */
    group_subjects: GitlabGroup[];

    /**
     * Metadata tag for the role level this binding represents.
     * Write one of: role:admin | role:owner | role:maintainer |
     *               role:developer | role:reporter | role:guest
     */

    role: Role[];
  };

  permits = {
    /** Returns true when the context subject is covered by this binding. */
    bound: (ctx: Context) =>
      this.related.subjects.includes(ctx.subject) ||
      this.related.group_subjects.traverse((g) => g.permits.is_guest(ctx)),
  };
}
