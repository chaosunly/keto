namespace role {
  relation members: user
  permission manage_users = members
}

namespace user {
  relation role: role
}