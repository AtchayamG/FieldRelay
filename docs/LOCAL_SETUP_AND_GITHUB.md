# Local Setup and GitHub Publication

Target local path:

```text
D:\Work\Codex\Hackathon Projects\FieldRelay
```

Remote repository:

```text
https://github.com/AtchayamG/FieldRelay.git
```

## Clone from the prepared Git bundle

```powershell
cd "D:\Work\Codex\Hackathon Projects"
git clone "C:\PATH\TO\FieldRelay.bundle" FieldRelay
cd FieldRelay
git remote remove origin
git remote add origin https://github.com/AtchayamG/FieldRelay.git
git push -u origin main
```

## Or extract the ZIP and initialize Git

```powershell
cd "D:\Work\Codex\Hackathon Projects"
Expand-Archive "C:\PATH\TO\FieldRelay.zip" -DestinationPath .
cd FieldRelay
git init
git branch -M main
git remote add origin https://github.com/AtchayamG/FieldRelay.git
git add .
git commit -m "Initialize FieldRelay blueprint and UI UX mockups"
git push -u origin main
```
