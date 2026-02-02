import { Namespace } from "@ory/keto-namespace-types";

export class User implements Namespace {}

export class Role implements Namespace {
  related: {
    members: User[];
  };

  permits = {
    members: this.related.members,
    manage_users: this.related.members,
  };
}