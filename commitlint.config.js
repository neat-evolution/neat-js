module.exports = {
  extends: ['@commitlint/config-conventional', '@commitlint/config-workspace-scopes'],
  ignores: [(commit) => commit.startsWith('Change files')],
}
