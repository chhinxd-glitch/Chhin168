# My Web Terminal (Node.js version)

Terminal ដែលរត់ក្នុង Browser ដោយភ្ជាប់ទៅ shell ពិតៗនៅលើម៉ាស៊ីនរបស់អ្នក ដោយប្រើ Node.js។

## របៀបប្រើ

### ១. ដំឡើង dependencies

```bash
npm install
```

> **ចំណាំ**: `node-pty` ត្រូវការ build tools មួយចំនួន (Python + C++ compiler) ព្រោះវាជា native module។
> - **Windows**: អាចត្រូវការដំឡើង `windows-build-tools` ឬ Visual Studio Build Tools
> - **Mac**: ត្រូវការ Xcode Command Line Tools (`xcode-select --install`)
> - **Linux**: ត្រូវការ `build-essential` (`sudo apt install build-essential python3`)

### ២. ដំណើរការ server

```bash
npm start
```

### ៣. បើក browser

ចូលទៅកាន់: **http://localhost:5000**

---

## របៀបដំណើរការ (Architecture)

```
Browser (xterm.js)  <--- WebSocket --->  Node.js (server.js)  <--->  node-pty (real shell)
```

1. **`server.js`** (Node.js/Express) ប្រើ `node-pty` ដើម្បីបើក shell process ថ្មី (bash លើ Linux/Mac, powershell.exe លើ Windows)
2. Server listen ព្រឹត្តិការណ៍ `onData` ពី shell ហើយផ្ញើ output ទៅ browser តាម **Socket.IO**
3. **`public/index.html`** ប្រើ **xterm.js** ដើម្បីបង្ហាញ terminal UI ក្នុង browser
4. នៅពេលអ្នកវាយអក្សរ -> ផ្ញើទៅ server -> សរសេរចូល `ptyProcess.write()` ដូចជាអ្នកកំពុងវាយក្នុង terminal ផ្ទាល់
5. នៅពេល client ផ្តាច់ (disconnect) -> shell process ត្រូវបានបិទដោយស្វ័យប្រវត្តិ (`ptyProcess.kill()`) ដើម្បីកុំឲ្យលេចធ្លាយ process

## ចំណាំសំខាន់ (Security Warning)

⚠️ កូដនេះផ្តល់សិទ្ធិឲ្យអ្នកណាដែលចូលដល់ web page នេះ **រត់ command លើម៉ាស៊ីនរបស់អ្នកបានពេញលេញ**

- **កុំដាក់ឲ្យ public** ដោយគ្មាន authentication (password/login)
- ត្រូវប្រើសម្រាប់ development/personal use ប៉ុណ្ណោះ លុះត្រាតែអ្នកបន្ថែម login system
- បើដាក់លើ production server សូមប្រើ HTTPS + authentication (ឧ. Passport.js) ជាមុនសិន

## ការធ្វើឲ្យប្រសើរឡើង (Ideas to extend)

- បន្ថែម login page (Passport.js, JWT) ដើម្បីការពារសុវត្ថិភាព
- បន្ថែម multiple terminal tabs ក្នុងមួយ session
- Save command history ទៅ database
- ដាក់ពណ៌ (theme) ផ្សេងៗតាមចំណូលចិត្ត
- Deploy ជាមួយ `pm2` សម្រាប់ production
