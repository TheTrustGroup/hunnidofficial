# Step 0: Get your code into GitHub (before Step 2)

Vercel deploys **from your GitHub repo**. If the repo is empty, Vercel has nothing to build. So you must **commit** your local code and **push** it to GitHub first. Then do Step 2 (create Vercel project from that repo).

---

## Order of operations

1. **You have:** Code on your machine (e.g. `HunnidOfficial` folder) and an **empty** GitHub repo (e.g. `TheTrustGroup/hunnidofficial`).
2. **You do:** Commit the code locally, add the GitHub repo as `origin`, push. Now the repo **has** the code.
3. **Then:** Step 2 in STEP5_ENV_AND_DEPLOY — in Vercel you “Import” that GitHub repo, set root directory and env vars, deploy.

---

## Commands (run from your project root)

**Project root** = the folder that contains `World-Class Warehouse Inventory & Smart POS System` (or, if you moved things, the folder that contains `warehouse-pos`). For you that’s likely:

`/Users/raregem.zillion/Desktop/HunnidOfficial`

### 1. Go to project root

```bash
cd /Users/raregem.zillion/Desktop/HunnidOfficial
```

### 2. If this is not yet a git repo

```bash
git init
```

### 3. Add a .gitignore (so you don’t commit secrets or node_modules)

Create a file named `.gitignore` in the project root if it doesn’t exist, with at least:

```
node_modules/
.env
.env.local
.env.production
.env*.local
dist/
.vercel
*.log
.DS_Store
```

### 4. Add the GitHub repo as remote

Use your real repo URL. Example:

```bash
git remote add origin https://github.com/TheTrustGroup/hunnidofficial.git
```

If `origin` already exists but points elsewhere, fix it:

```bash
git remote set-url origin https://github.com/TheTrustGroup/hunnidofficial.git
```

### 5. Commit everything

```bash
git add .
git status
git commit -m "Initial commit: Hunnid Official warehouse POS"
```

### 6. Push to GitHub

```bash
git branch -M main
git push -u origin main
```

If GitHub repo already has a branch (e.g. `main`) and you get errors, you may need to pull first or force-push once (only if you’re sure the remote can be replaced):

```bash
git pull origin main --allow-unrelated-histories
# resolve any conflicts, then:
git push -u origin main
```

---

## After the push

- Open `https://github.com/TheTrustGroup/hunnidofficial` — you should see your folders (`World-Class Warehouse Inventory & Smart POS System`, etc.).
- **Then** do **Step 2** in `STEP5_ENV_AND_DEPLOY.md`: create the Vercel project, connect it to **this** repo, set Root Directory and env vars, deploy.

So: **Commit & push first → then Vercel (Step 2).**
