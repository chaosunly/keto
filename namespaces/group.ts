import { Namespace, Context } from "@ory/keto-namespace-types";
import { User } from "./user";

/**
 * Group namespace used by the IAM app service layer.
 *
 * This namespace keeps compatibility with existing tuples:
 *   Group:<id>#org@<organizationId>
 *   Group:<id>#admins@<userId>
 *   Group:<id>#members@<userId>
 */
export class Group implements Namespace {
  related: {
    // Stored as a raw subject_id by the current app service layer.
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
