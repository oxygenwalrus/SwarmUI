@echo off
REM Sync latest changes from upstream mcmonkeyprojects/SwarmUI into your fork.

echo =^> Fetching upstream...
git fetch upstream

echo.
echo =^> Commits in upstream not yet in your master:
git log --oneline master..upstream/master

echo.
echo =^> Merging upstream/master into master...
git merge upstream/master --no-edit -m "chore: merge upstream mcmonkeyprojects/SwarmUI"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Merge had conflicts. Resolve them then run: git push origin master
    exit /b 1
)

echo.
echo =^> Pushing to your fork...
git push origin master

echo.
echo Done! Your fork is now up to date with upstream.
echo Check for conflicts in AdminAPI.cs or T2IAPI.cs if merge required manual resolution.
