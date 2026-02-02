import { Namespace, Context } from "@ory/keto-namespace-types"

class Role implements Namespace {
  related: {
    members: User[]
  }

  permits = {
    manage_users: (ctx: Context): boolean =>
      this.related.members.includes(ctx.subject),
  }
}
