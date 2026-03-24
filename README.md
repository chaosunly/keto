# Ory Keto - Permissions & RBAC

This directory contains the Ory Keto configuration for implementing Role-Based Access Control (RBAC) with the Zanzibar permission model.

## Overview

Ory Keto provides fine-grained access control through relationship-based permissions. This implementation includes:

- **GlobalRole**: Platform-wide SuperAdmin capabilities
- **Organization**: Multi-tenant support with hierarchical permissions
- **Group**: User groups within organizations
- **Role**: Custom roles with granular permissions
- **GitLab**: Project/group access control mirroring GitLab's access levels
- **Matrix**: Element Matrix homeserver access management (Org → Space → Room hierarchy)

## Quick Links

📖 **[Complete RBAC Implementation Guide](../RBAC-IMPLEMENTATION.md)** - Full documentation with examples

🚀 **[SuperAdmin Setup](../scripts/init-superadmin.sh)** - Create root user with full permissions

🎯 **[CRUD Demo](../scripts/demo-superadmin-crud.sh)** - Demonstrate SuperAdmin capabilities

## Configuration Files

- [`keto.yml`](./keto.yml) - Main Keto configuration (namespace entrypoint: `namespaces/index.ts`)
- [`namespaces/index.ts`](./namespaces/index.ts) - Active namespace entrypoint loaded by Keto
- [`namespaces/config.ts`](./namespaces/config.ts) - **Deprecated** flat monolith kept for reference; do not add new namespaces here

### Adding a new namespace

1. Create `namespaces/<name>.ts` following the existing file patterns (see `gitlabGroup.ts` for a documented example)
2. Export the class from `namespaces/index.ts`
3. Redeploy — Keto picks up the change on restart

## Namespace Files

| File | Classes | Description |
| --- | --- | --- |
| `user.ts` | `User` | Leaf subject — Ory Kratos identity |
| `globalRole.ts` | `GlobalRole` | Platform-wide super-admin |
| `organization.ts` | `Organization`, `OrgGroup`, `OrgRole` | Multi-tenant org with delegated roles |
| `group.ts` | `Group` | Legacy IAM app group (service-layer compat) |
| `role.ts` | `Role` | GitLab access-level marker |
| `roleBinding.ts` | `RoleBinding` | Subject-to-role intermediary for GitLab namespaces |
| `gitlabGroup.ts` | `GitlabGroup` | GitLab group with 6-level access hierarchy |
| `gitlabProject.ts` | `GitlabProject` | GitLab project with parent group inheritance |
| `matrixOrg.ts` | `MatrixOrg` | Matrix homeserver org (top-level) |
| `matrixSpace.ts` | `MatrixSpace` | Matrix space with parent org inheritance |
| `matrixRoom.ts` | `MatrixRoom` | Matrix room with parent space/org inheritance |

## Permission Model

```
GlobalRole:admin (SuperAdmin)
  └─ Full access to ALL resources

Organization
  ├─ owners: Highest level within org
  ├─ admins: Org administrators
  ├─ members: Regular members
  ├─ groups: User groups
  └─ roles: Custom permission roles
      ├─ manage_users_roles
      ├─ manage_groups_roles
      ├─ manage_roles_roles
      └─ manage_org_roles

GitLab (Admin > Owner > Maintainer > Developer > Reporter > Guest)
  GitlabGroup
    └─ GitlabProject (inherits via parent_group)

Matrix (matrix_admin > moderator/support > member > viewer)
  MatrixOrg
    └─ MatrixSpace  (inherits via parent → MatrixOrg)
         └─ MatrixRoom (inherits via parent → MatrixSpace → MatrixOrg)
```

### Matrix roles

| Role | manage_users | manage_roles | manage_spaces | manage_rooms | view_audit | impersonate_support | view_content |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `matrix_admin` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `moderator` | (space/room scope) | — | — | (space scope) | — | — | ✓ |
| `support` | — | — | — | — | ✓ | ✓ | ✓ |
| `member` | — | — | — | — | — | — | ✓ |
| `viewer` | — | — | — | — | — | — | ✓ |

Roles inherit downward: `matrix_admin` passes all `is_moderator` / `is_support` checks.
Parent resources propagate roles to child resources via the `parent` relation tuple.

### Matrix relation tuple examples

```
# Grant alice matrix_admin on org "acme"
MatrixOrg:acme#matrix_admin@alice

# Link space "general" to org "acme"
MatrixSpace:space-001#parent@MatrixOrg:acme

# Link room "announcements" to space "general"
MatrixRoom:room-001#parent@MatrixSpace:space-001

# Grant carol moderator directly on space "general"
MatrixSpace:space-001#moderator@carol
# carol now also passes manage_rooms on any room inside space-001
```

## Setup

### 1. Environment Variables

```bash
export DSN="postgresql://user:password@host:5432/keto"
```

### 2. Deploy to Railway

The Dockerfile and configuration are ready for Railway deployment. Keto will automatically:

- Load namespace configuration from `namespaces/index.ts`
- Run migrations on startup
- Expose Read API on port 4466
- Expose Write API on port 4467

### 3. Initialize SuperAdmin

After deployment, create the root SuperAdmin user:

```bash
cd ../scripts
./init-superadmin.sh
```

## API Endpoints

### Read API (Port 4466)

- `POST /relation-tuples/check` - Check if permission exists
- `GET /relation-tuples` - List relation tuples
- `POST /relation-tuples/expand` - Expand permission tree

### Write API (Port 4467)

- `PUT /admin/relation-tuples` - Create relation
- `DELETE /admin/relation-tuples` - Delete relation
- `PATCH /admin/relation-tuples` - Batch operations

## Example Usage

### Check Permission

```bash
curl -X POST http://keto:4466/relation-tuples/check \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "Organization",
    "object": "acme-corp",
    "relation": "manage_users",
    "subject_id": "user_123"
  }'
```

### Check Matrix Permission

```bash
curl -X POST http://keto:4466/relation-tuples/check \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "MatrixOrg",
    "object": "acme",
    "relation": "manage_rooms",
    "subject_id": "alice"
  }'
```

### Grant Permission

```bash
curl -X PUT http://keto:4467/admin/relation-tuples \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "MatrixOrg",
    "object": "acme",
    "relation": "matrix_admin",
    "subject_id": "alice"
  }'
```

## Resources

- [Ory Keto Documentation](https://www.ory.sh/docs/keto/)
- [Zanzibar Paper](https://research.google/pubs/pub48190/)
- [Full RBAC Implementation Guide](../RBAC-IMPLEMENTATION.md)
