bash# 1. Switch to your target branch (test)
git checkout test

# 2. Pull the latest updates to ensure it is up to date
git pull origin test

# 3. Merge the dev branch into the current test branch
git merge dev

# 4. Push the merged changes to your remote repository
git push origin test