import { Namespace } from "@ory/keto-namespace-types";
import { User } from "./user";

/**
 * Represents a named access level in the GitLab-style permission model.
 *
 * Predefined role instances — use these object IDs when writing relationship tuples:
 *   role:admin        – platform/site-wide administrator; bypasses all resource checks
 *   role:owner        – full control; can delete or transfer the resource
 *   role:maintainer   – can merge MRs, manage settings and CI/CD variables
 *   role:developer    – can push code, manage branches, run pipelines
 *   role:reporter     – can read repository, download CI artifacts
 *   role:guest        – read-only access; can view issues and wiki
 *
 * Access level hierarchy (numeric value used for documentation only):
 *   admin (60) > owner (50) > maintainer (40) > developer (30) > reporter (20) > guest (10)
 *
 * The role level is NOT enforced by logic in this namespace.
 * It is encoded on the resource side by placing a RoleBinding in the
 * correct "*_bindings" relation on a GitlabGroup or GitlabProject namespace.
 *
 * The `role` relation on RoleBinding references these instances as a
 * queryable metadata tag (e.g. "list all developer bindings on project X").
 */
export class Role implements Namespace {
  related: {
    /** Compatibility relation used by app group-role assignment. */
    groups: User[];
  };
}
