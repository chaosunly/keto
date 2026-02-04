# Ory Keto - Permissions & RBAC

This directory contains the Ory Keto configuration for implementing Role-Based Access Control (RBAC) with the Zanzibar permission model.

## Overview

Ory Keto provides fine-grained access control through relationship-based permissions. This implementation includes:

- **GlobalRole**: Platform-wide SuperAdmin capabilities
- **Organization**: Multi-tenant support with hierarchical permissions
- **Group**: User groups within organizations
- **Role**: Custom roles with granular permissions

## Quick Links

📖 **[Complete RBAC Implementation Guide](../RBAC-IMPLEMENTATION.md)** - Full documentation with examples

🚀 **[SuperAdmin Setup](../scripts/init-superadmin.sh)** - Create root user with full permissions

🎯 **[CRUD Demo](../scripts/demo-superadmin-crud.sh)** - Demonstrate SuperAdmin capabilities

## Configuration Files

- [`keto.yml`](./keto.yml) - Main Keto configuration
- [`namespaces/config.ts`](./namespaces/config.ts) - Permission model definitions

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

Group
  ├─ org: Parent organization
  └─ members: Group members

Role
  ├─ org: Parent organization
  └─ members: Users with this role
```

## Setup

### 1. Environment Variables

```bash
export DSN="postgresql://user:password@host:5432/keto"
```

### 2. Deploy to Railway

The Dockerfile and configuration are ready for Railway deployment. Keto will automatically:

- Apply namespace configuration from `/etc/keto/namespaces`
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

### Grant Permission

```bash
curl -X PUT http://keto:4467/admin/relation-tuples \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "Organization",
    "object": "acme-corp",
    "relation": "admins",
    "subject_id": "user_123"
  }'
```

## Resources

- [Ory Keto Documentation](https://www.ory.sh/docs/keto/)
- [Zanzibar Paper](https://research.google/pubs/pub48190/)
- [Full RBAC Implementation Guide](../RBAC-IMPLEMENTATION.md)
