#!/bin/bash
# Sync latest changes from upstream mcmonkeyprojects/SwarmUI into your fork.
# Safe to run any time - will not touch swarmui-react/ or your custom files.

set -e

echo "==> Fetching upstream..."
git fetch upstream

echo ""
echo "==> Commits in upstream not yet in your master:"
git log --oneline master..upstream/master

AHEAD=$(git rev-list --count master..upstream/master)
if [ "$AHEAD" -eq 0 ]; then
    echo "Already up to date with upstream. Nothing to merge."
    exit 0
fi

echo ""
echo "==> Merging upstream/master into master..."
git merge upstream/master --no-edit -m "chore: merge upstream mcmonkeyprojects/SwarmUI"

echo ""
echo "==> Pushing to your fork (origin)..."
git push origin master

echo ""
echo "Done! Your fork is now up to date with upstream."
echo "Check for any conflicts in AdminAPI.cs or T2IAPI.cs if the merge required manual resolution."
