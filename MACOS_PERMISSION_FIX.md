# macOS Permission Fix for Next.js

## The Issue
You're seeing "Operation not permitted (os error 1)" because macOS is blocking Next.js from reading files in `node_modules`.

## Solution: Grant Full Disk Access

1. **Open System Settings** (or System Preferences on older macOS)
2. Go to **Privacy & Security** (or **Security & Privacy**)
3. Click on **Full Disk Access** in the left sidebar
4. Click the **+** button to add an application
5. Add **Terminal** (or your IDE like Cursor/VS Code)
   - Terminal is usually at: `/Applications/Utilities/Terminal.app`
   - VS Code/Cursor might be at: `/Applications/Visual Studio Code.app` or `/Applications/Cursor.app`
6. Make sure the checkbox next to the application is **checked**
7. You may need to restart Terminal/your IDE after granting permission

## Alternative: Use a Different Terminal

If you're using a third-party terminal, you might need to grant Full Disk Access to that specific terminal application.

## After Fixing

Once you've granted Full Disk Access:
1. Restart your terminal/IDE
2. Run `npm run dev` again
3. The app should now load properly at http://localhost:3000

## Why This Happens

macOS Catalina and later versions have strict security controls that prevent applications from accessing certain files unless explicitly granted permission. Next.js needs to read files in `node_modules` during the build process, which requires Full Disk Access.



