# Antigravity Machine-Wide Developer Toolchain

**Version:** 1.0.0  
**Machine Installation Directory:** `C:\Users\LOQ\.gemini\config\`  
**CLI Path:** `C:\Users\LOQ\AppData\Local\agy\bin\agy.exe`  
**Registry File:** `C:\Users\LOQ\.gemini\config\toolchain.json`

---

## 1. Machine-Global Toolchain Architecture

Antigravity uses a machine-global customization discovery architecture on Windows:

```text
                     THIS COMPUTER (Windows_NT)
                                 │
                   C:\Users\LOQ\.gemini\config\
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
     plugins/                 skills/                 AGENTS.md
 ┌──────────────┐        ┌──────────────┐        ┌──────────────────┐
 │ superpowers  │        │ gsd-* (72)   │        │ Global Tool      │
 │ agent-skills │        │ ui-styling   │        │ Selection & Task │
 └──────────────┘        │ ui-ux-pro-max│        │ Policy           │
                         └──────────────┘        └──────────────────┘
                                 │
                       ALL ACCOUNTS & PROJECTS
```

### Account-Independent Scope Analysis

- **Local Machine Scope (PASS):** Installed plugins (`superpowers`, `agent-skills`) and skills (`gsd-*`, etc.) are physically located in `C:\Users\LOQ\.gemini\config\`. They are automatically loaded for **ANY** project or workspace opened on THIS COMPUTER.
- **Account Switch Scope (PLATFORM LIMITED):** Local plugins and skills remain on local disk when switching Google/Antigravity accounts. If Antigravity platform cloud features require re-authenticating, local plugin files in `~/.gemini/config/` remain accessible without reinstalling.
- **New Project Scope (PASS):** Any new project or cloned repository immediately discovers global plugins and skills without reinstalling.

---

## 2. Tool Evaluation & Status Registry

| Tool Name | Scope | Installation Method / Path | Status | Purpose & Policy |
| :--- | :--- | :--- | :---: | :--- |
| **Superpowers** | `GLOBAL_MACHINE` | `agy plugin install https://github.com/obra/superpowers` | **INSTALLED** | Software engineering, orchestration, subagents, and test-driven workflows |
| **Agent-Skills** | `GLOBAL_MACHINE` | `agy plugin install https://github.com/addyosmani/agent-skills.git` | **INSTALLED** | Engineering skills for code review, accessibility, testing, and performance |
| **Get Shit Done (GSD)** | `GLOBAL_MACHINE` | `C:\Users\LOQ\.gemini\config\skills/` (72 skills) | **INSTALLED** | Multi-phase roadmap planning, autonomous phase execution, and verification |
| **CodeRabbit** | `GITHUB_PR` | GitHub App Integration | **CONFIGURED** | Automated AI pull request code review on GitHub PR creation |
| **Roo Code Nightly** | N/A | N/A | **NOT INSTALLED** | *Duplicate/Conflict:* Separate extension/agent framework; avoided to prevent prompt collisions |
| **Ralph Loop** | `GLOBAL_MACHINE` | Built-in via GSD Autonomous (`gsd-autonomous`) | **INSTALLED** | Autonomous execution loop with strict iteration limits and test gates |
| **Ponytail** | N/A | N/A | **NOT INSTALLED** | *Ambiguous/Unverified Identity:* Not an audited/verified AI coding tool |

---

## 3. Automatic Tool Selection Policy

The global policy (`C:\Users\LOQ\.gemini\config\AGENTS.md`) automatically selects the appropriate toolchain tier based on task complexity:

- **Small Change / Bugfix:** `gsd-quick` or direct skill execution + target unit test.
- **Medium Feature:** `Superpowers` + relevant `Agent-Skill` + module tests.
- **Large Multi-Phase Feature:** `GSD` (`gsd-plan-phase` $\rightarrow$ `gsd-execute-phase`) + `Superpowers` + full regression suite.
- **Security & RLS:** Security skills + secret scan + adversarial RLS tests.
- **Web UI:** `ui-styling` + `ui-ux-pro-max` + multi-viewport build verification.
- **Android / Mobile:** `VisualVerificationEngine` + `gradlew test` + `assembleRelease`.
- **PR & Code Review:** `gsd-ship` + CodeRabbit GitHub integration.

---

## 4. Reusable Bootstrap Scripts

1. **Machine-Wide Bootstrap:** `C:\Users\LOQ\.gemini\bootstrap-antigravity-toolchain.ps1`
   - Detects system binaries, verifies `~/.gemini/config/`, installs missing global plugins, verifies 70+ skills, and generates global configuration. Safe to run multiple times (idempotent).
2. **Project Bootstrap:** `C:\Users\LOQ\.gemini\bootstrap-antigravity-project.ps1`
   - Run inside any new or cloned repository (`powershell -ExecutionPolicy Bypass -File C:\Users\LOQ\.gemini\bootstrap-antigravity-project.ps1 -ProjectDir .`).
   - Links local project to machine-global tools without reinstalling plugins.

---

## 5. Security & Privacy Policy

- Zero secrets, API keys, `service_role` keys, or credentials are allowed in global configs or committed documentation.
- All tools respect `.gitignore` rules.
- Local scratch files remain isolated in session scratch storage.
