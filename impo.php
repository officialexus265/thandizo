1111....    

git add package.json
git commit -m "Fix NextAuth and Prisma for Vercel"
git push


222....

git add .
git commit -m "are buttons, signout redirect"
git push origin main




npm install error

cd "D:\website projects\bussiness\Thandizo"

# Confirm registry is still official
npm config get registry

# Remove old install data (this is the important part)
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue

# Fresh install from registry.npmjs.org
npm install