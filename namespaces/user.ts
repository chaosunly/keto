import { Namespace } from "@ory/keto-namespace-types";

/**
 * Represents an individual platform user (identity from Ory Kratos).
 * Used as the leaf subject in all permission checks.
 */
export class User implements Namespace {}
