# Vercel project link — avoid deploying to the wrong project

## Why the deploy went to the wrong project

Vercel CLI deploys to **whichever project this directory is linked to**. The link is stored **only on your machine** in `.vercel/project.json` (and is correctly **not** committed — `.vercel` is in `.gitignore`).

So:

1. **First time** someone ran `vercel` or `vercel link` in this repo (on this machine or the one you cloned from), they linked the folder to a **specific** Vercel project (e.g. the original "warehouse-pos" project from the repo you cloned).
2. Every subsequent `vercel --prod` from this folder uses that **same** link and deploys to that project.
3. If your **intended** project is different (e.g. **hunnidofficial-mb6h**), you must **re-link** this folder to that project once. After that, deploys go to the right place.

So the mistake was not the logo changes — it was that this directory was still linked to the **other** project (the one you cloned from), not to **hunnidofficial-mb6h**.

---

## Fix: link this folder to your project

Run this from the **warehouse-pos** directory (frontend root):

```bash
cd "/path/to/warehouse-pos"   # or your actual path
vercel link
```

When prompted:

1. **Set up and deploy?** — Choose your **team** (the one that owns **hunnidofficial-mb6h**).
2. **Link to existing project?** — Yes.
3. **Project name** — Select **hunnidofficial-mb6h** (your project), **not** "warehouse-pos" or any other.

That updates `.vercel/project.json` on your machine. From then on, `./deploy_vercel.sh` (and `vercel --prod`) will deploy to **hunnidofficial-mb6h**.

To confirm the link:

```bash
vercel project ls
# or
cat .vercel/project.json
```

The `projectName` in `project.json` should be **hunnidofficial-mb6h** (or whatever your real project name is).

---

## How to make sure it doesn’t happen again

1. **Re-link once**  
   Do the `vercel link` steps above and select **hunnidofficial-mb6h**. No need to do it again unless you delete `.vercel` or work from another clone/machine.

2. **Keep `.vercel` out of git**  
   `.vercel` is already in `.gitignore`. Do not remove it. That way each clone/machine can link to the correct project for that context.

3. **Check before deploying**  
   Before running `./deploy_vercel.sh` or `vercel --prod`, you can run:
   ```bash
   cat .vercel/project.json
   ```
   and confirm `projectName` is **hunnidofficial-mb6h**.

4. **Use the deploy script safeguard**  
   `deploy_vercel.sh` now prints the linked project name before building. To **block** deploys when the link is wrong, set the expected project name and run the script:

   ```bash
   export VERCEL_PROJECT_NAME=hunnidofficial-mb6h
   ./deploy_vercel.sh
   ```

   If the linked project is not `hunnidofficial-mb6h`, the script exits with a clear message and does not deploy. You can add `export VERCEL_PROJECT_NAME=hunnidofficial-mb6h` to your shell profile or a local `.env.deploy` (do not commit secrets) and source it before deploying.

---

## Summary

| What happened | This folder was linked to the **other** project (e.g. warehouse-pos from the repo you cloned from). |
|--------------|------------------------------------------------------------------------------------------------------|
| Fix          | Run `vercel link` and select **hunnidofficial-mb6h**. Then deploy again.                            |
| Prevention   | Re-link once to the correct project; keep `.vercel` in `.gitignore`; optionally verify `projectName` before deploy. |
