namespace role implements Namespace {
  relation members: User
  permission manage_users = members
}
