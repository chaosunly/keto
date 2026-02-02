import { Namespace, Context } from "@ory/keto-namespace-types";
import { User } from "./user";

export class Role implements Namespace {
  related: {
    members: User[];
  };

  permits = {
    manage_users: (ctx: Context): boolean =>
      this.related.members.includes(ctx.subject),
  };
}