# MCP Servers Setup Guide

## สถานะ MCP Servers ที่ใช้งาน

โปรเจค The Bliss at Home ใช้ MCP servers ทั้งหมด **4 ตัว**:

1. **Supabase** - Database & Backend operations
2. **Context7** - Documentation lookup
3. **shadcn-ui** - UI Components
4. **Playwright** - Browser automation & testing

---

## การตั้งค่า MCP Configuration

### ไฟล์: `.mcp.json` (Project-level)

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx.cmd",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "sbp_5733db61c394d462464ae84bcaacdc2eb85511f4",
        "--project-ref",
        "rbdvlfriqjnwpxmmgisf"
      ]
    },
    "context7": {
      "command": "cmd",
      "args": [
        "/c",
        "node",
        "C:\\Users\\chitp\\AppData\\Roaming\\nvm\\v25.1.0\\node_modules\\@upstash\\context7-mcp\\dist\\index.js"
      ]
    },
    "shadcn-ui": {
      "command": "cmd",
      "args": [
        "/c",
        "node",
        "C:\\Users\\chitp\\AppData\\Roaming\\nvm\\v25.1.0\\node_modules\\@jpisnice\\shadcn-ui-mcp-server\\build\\index.js"
      ]
    },
    "playwright": {
      "command": "npx.cmd",
      "args": [
        "-y",
        "@executeautomation/playwright-mcp-server@latest"
      ],
      "env": {
        "PLAYWRIGHT_MCP_DATA_DIR": ".playwright-mcp"
      }
    }
  }
}
```

### ไฟล์: `~/.claude/settings.json` (Global settings)

```json
{
  "env": {
    "SUPABASE_ACCESS_TOKEN": "sbp_78852f0dbbd6490de3f54e97d2dd936ca9a5a363"
  },
  "permissions": {
    "allow": [
      "Bash(npm uninstall:*)",
      "Bash(pnpm --version:*)",
      "Bash(psql:*)"
    ]
  },
  "enableAllProjectMcpServers": true,
  "autoUpdatesChannel": "latest"
}
```

**สำคัญ:** `enableAllProjectMcpServers: true` จะเปิดใช้งาน MCP servers จาก `.mcp.json`

---

## ขั้นตอนการตรวจสอบและแก้ไข MCP

### 1. ตรวจสอบว่า MCP ทั้ง 4 ตัวพร้อมใช้งานหรือไม่

ใน Claude Code ให้ถาม:
```
ตรวจสอบให้หน่อยว่ามีการเชื่อมการทำงานกับ mcp อะไรบ้าง และแต่ละตัวพร้อมใช้งานไหม
```

หรือใช้ script ตรวจสอบ (ดูด้านล่าง)

### 2. ถ้า MCP ตัวใดตัวหนึ่งไม่ทำงาน

#### A. ตรวจสอบ `.mcp.json`
```bash
cat .mcp.json
```

ต้องมี 4 servers: `supabase`, `context7`, `shadcn-ui`, `playwright`

#### B. ตรวจสอบว่า global MCP packages ติดตั้งแล้วหรือยัง

```bash
# Context7
npm list -g @upstash/context7-mcp

# shadcn-ui
npm list -g @jpisnice/shadcn-ui-mcp-server
```

ถ้ายังไม่ติดตั้ง:
```bash
npm install -g @upstash/context7-mcp
npm install -g @jpisnice/shadcn-ui-mcp-server
```

#### C. Reload Claude Code

กด `Ctrl+Shift+P` → พิมพ์ "Reload Window" → Enter

---

## วิธีแก้ปัญหา MCP แต่ละตัว

### 🔴 Supabase MCP ไม่ทำงาน

**สาเหตุ:** Access token หมดอายุ หรือ npx ไม่ทำงาน

**วิธีแก้:**
1. ตรวจสอบ access token ใน `.mcp.json`
2. ตรวจสอบว่า `npx` ทำงานได้:
   ```bash
   npx --version
   ```
3. ลองรัน manually:
   ```bash
   npx -y @supabase/mcp-server-supabase@latest --access-token YOUR_TOKEN --project-ref rbdvlfriqjnwpxmmgisf
   ```

---

### 🔴 Context7 MCP ไม่ทำงาน

**สาเหตุ:** Package ไม่ได้ติดตั้ง หรือ path ไม่ถูกต้อง

**วิธีแก้:**
1. ติดตั้งใหม่:
   ```bash
   npm install -g @upstash/context7-mcp
   ```

2. หา path ที่ถูกต้อง:
   ```bash
   npm root -g
   # ผลลัพธ์: C:\Users\chitp\AppData\Roaming\nvm\v25.1.0\node_modules
   ```

3. อัพเดท path ใน `.mcp.json`:
   ```json
   "context7": {
     "command": "cmd",
     "args": [
       "/c",
       "node",
       "C:\\Users\\chitp\\AppData\\Roaming\\nvm\\v25.1.0\\node_modules\\@upstash\\context7-mcp\\dist\\index.js"
     ]
   }
   ```

---

### 🔴 shadcn-ui MCP ไม่ทำงาน

**สาเหตุ:** Package ไม่ได้ติดตั้ง หรือ path ไม่ถูกต้อง

**วิธีแก้:**
1. ติดตั้งใหม่:
   ```bash
   npm install -g @jpisnice/shadcn-ui-mcp-server
   ```

2. หา path ที่ถูกต้อง:
   ```bash
   npm root -g
   ```

3. อัพเดท path ใน `.mcp.json`:
   ```json
   "shadcn-ui": {
     "command": "cmd",
     "args": [
       "/c",
       "node",
       "C:\\Users\\chitp\\AppData\\Roaming\\nvm\\v25.1.0\\node_modules\\@jpisnice\\shadcn-ui-mcp-server\\build\\index.js"
     ]
   }
   ```

---

### 🔴 Playwright MCP ไม่ทำงาน

**สาเหตุ:** ไม่มีใน `.mcp.json` หรือ npx ไม่ทำงาน

**วิธีแก้:**
1. เช็คว่ามีใน `.mcp.json` หรือไม่:
   ```bash
   grep -A 10 "playwright" .mcp.json
   ```

2. ถ้าไม่มี ให้เพิ่มเข้าไป:
   ```json
   "playwright": {
     "command": "npx.cmd",
     "args": [
       "-y",
       "@executeautomation/playwright-mcp-server@latest"
     ],
     "env": {
       "PLAYWRIGHT_MCP_DATA_DIR": ".playwright-mcp"
     }
   }
   ```

3. Reload Claude Code

---

## Script ตรวจสอบ MCP Status

ใช้ script `check-mcp.sh` (ดูด้านล่าง) เพื่อตรวจสอบ MCP ทั้งหมด

---

## Checklist เมื่อเปิดเครื่องใหม่

- [ ] เปิด Claude Code
- [ ] รัน `bash check-mcp.sh` หรือถามใน Claude Code
- [ ] ถ้า MCP ตัวใดไม่ทำงาน ให้ดูที่ "วิธีแก้ปัญหา" ด้านบน
- [ ] Reload Claude Code หลังแก้ไข

---

## หมายเหตุสำคัญ

1. **ไม่ต้อง commit `.mcp.json`** เข้า git (มี access tokens)
2. **Backup `.mcp.json`** ไว้ที่อื่นเผื่อหาย
3. **หลัง update Node.js version** ต้องอัพเดท path ของ context7 และ shadcn-ui
4. **Playwright MCP** ใช้ `npx` ดังนั้นไม่ต้องติดตั้ง global

---

## การอัพเดท MCP Packages

### อัพเดท Context7
```bash
npm update -g @upstash/context7-mcp
```

### อัพเดท shadcn-ui
```bash
npm update -g @jpisnice/shadcn-ui-mcp-server
```

### อัพเดท Supabase & Playwright
ใช้ `@latest` ใน `.mcp.json` แล้ว จะอัพเดทอัตโนมัติ

---

## ติดต่อ / Help

ถ้ายังแก้ไม่ได้ ให้ส่ง:
1. Output จาก `bash check-mcp.sh`
2. เนื้อหาใน `.mcp.json`
3. Error message ที่เจอ
