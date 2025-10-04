module.exports = {
  branches: [
    'main',
    { name: 'next', prerelease: true },
    { name: 'beta', prerelease: true }
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md'
      }
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: true
      }
    ],
    [
      '@semantic-release/github',
      {
        assets: [
          { path: 'dist/**/*', label: 'Distribution files' }
        ]
      }
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
        message: 'chore(release): ${nextRelease.version}\n\n${nextRelease.notes}'
      }
    ]
  ]
};
