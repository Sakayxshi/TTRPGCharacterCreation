**Area 5: Authentication and access control** · [MariaDB student projects, fall 2026](https://mariadb.org/bachelor_hackathon_2026-09/)

# Tabletop Characters

A character creator for three tabletop role-playing games: The Witcher TRPG, Vampire: The Masquerade (5th edition) and Cyberpunk 2020. A Game Master creates a game, players join it with a code, and each player builds a character step by step.

The point of the project is **who may see and change what**. Players see their own character in full, only the basics of everyone else's, and a backstory only if its owner shares it. The GM sees everything in their own games. These rules are enforced **inside MariaDB**, not by the website: every user is a real MariaDB account, users cannot touch any table directly, and every read and write goes through a view or procedure that checks who is asking.

[![Database security tests](https://github.com/Sakayxshi/TTRPGCharacterCreation/actions/workflows/database-tests.yml/badge.svg)](https://github.com/Sakayxshi/TTRPGCharacterCreation/actions/workflows/database-tests.yml)

- **Project page and playable demo:** https://sakayxshi.github.io/ttrpg.github.io/ (the demo runs in the browser without a database)
- **Author:** Omar Aslan, Databases (CO-560), Constructor University

---

## Run it

### With Docker (any system)

You need Docker with Compose. This starts **MariaDB 13.1** and loads the whole database by itself.

```bash
git clone https://github.com/Sakayxshi/TTRPGCharacterCreation.git
cd TTRPGCharacterCreation
cp .env.example .env                 # then change the root password in .env
docker compose up -d --wait          # starts MariaDB 13.1 and runs sql/01 to sql/05
docker compose exec db bash /tests/security_tests.sh
```

The last command logs in as each demo account and checks that allowed actions work and forbidden ones are refused. It ends with:

```
52 passed, 0 failed
```

It exits with an error code if any check fails. The same tests run on GitHub on every push (badge above); the output of a run on **MariaDB 13.1.2** is saved in [`tests/results-mariadb-13.1.txt`](tests/results-mariadb-13.1.txt).

- **Port in use?** The database is published on port **3307**, so it doesn't clash with a MariaDB you already run on 3306. Change `MARIADB_PORT` in `.env` if 3307 is taken.
- **Start over:** `docker compose down -v` deletes everything; `up` loads it fresh.
- **Open a shell as a demo user:** `docker compose exec db mariadb -u player_ciri -pdemo-ciri-2026`, then `SET ROLE forge_user;`

The image is the MariaDB Foundation's 13.1 preview build, `quay.io/mariadb-foundation/mariadb-devel:13.1`. MariaDB 13.1 is needed for `DENY`; to try another image, set `MARIADB_IMAGE` in `.env`.

### On Windows without Docker

Install MariaDB 13.1, open the "Command Prompt (MariaDB 13.1)" and run `setup.bat` from the project folder. It feeds `sql/01` to `sql/05` to the server and asks for the root password once.

### Demo accounts

| Account | Password | Who it is |
|---|---|---|
| `gm_vesemir` | `demo-vesemir-2026` | GM of the Witcher and Vampire games |
| `player_ciri` | `demo-ciri-2026` | Player in all three games |
| `player_lambert` | `demo-lambert-2026` | Player in the Witcher game, GM of the Cyberpunk game |
| `outsider_zoltan` | `demo-zoltan-2026` | In no game at all |

These are demo passwords for a local test database. Never reuse them anywhere real.

---

## Who sees what

| Looking at… | Basics (name, race, clan, role) | Full sheet | Backstory |
|---|---|---|---|
| Your own character | yes | yes | yes |
| Another player's character in your game | yes | **no** | only if its owner shares it |
| Any character in a game you run (GM) | yes | yes | yes |
| A game you're not part of | **no** | **no** | **no** |

In Cyberpunk a player can also hide their real name or their handle from the other players (never both). The GM always sees both.

## How MariaDB enforces it

| MariaDB feature | Where | What it does here |
|---|---|---|
| **One MariaDB account per user, ED25519** | `sql/03_accounts.sql` | Signing up creates a real account with `IDENTIFIED VIA ed25519`. The `users` table has no password column, so a copy of our tables holds nothing to crack. |
| **A role with no default** | `sql/03_accounts.sql` | All users get the role `forge_user`, which is off until a session runs `SET ROLE forge_user`. A login alone can read nothing. |
| **`DENY` (new in 13.1)** | `sql/03_accounts.sql` | The role gets `SELECT, EXECUTE` on the whole schema, then `DENY SELECT` on all 11 private tables and `DENY EXECUTE` on `register_user`. A deny beats the schema-wide grant, so only the lookup tables, views and allowed procedures stay open. |
| **Locked owner accounts** | `sql/03_accounts.sql` | Views and procedures belong to `forge_owner` and `forge_admin`, which have `ACCOUNT LOCK`: nobody can log in as them. |
| **Definer views that check the caller** | `sql/04_views.sql` | 12 views with `SQL SECURITY DEFINER`. Each one reads the logged-in account with `USER()` and returns only that user's rows: their games, their full sheets, and other characters' public fields. |
| **Procedures for every write** | `sql/05_procedures.sql` | Creating or joining a game, saving a character, sharing a backstory: each is a procedure that checks the caller and the game rules, uses a transaction, and refuses with a clear message (`SIGNAL`). |
| **Safe sign-up** | `sql/03_accounts.sql` | `register_user` checks the name with a regex, builds `CREATE USER` with `QUOTE()`, and drops a half-created account if anything fails. Only the `forge_registrar` account may call it. |
| **Rules in the tables** | `sql/01_schema.sql` | `CHECK` constraints (username format, stat ranges, at least one Cyberpunk name visible), `ENUM`s, generated columns for derived stats, and a composite foreign key that only lets **players** of a game own a character there, so a GM can't. |

## What the tests check

`tests/security_tests.sh` runs 52 checks in 8 groups, each as the account that would really do it:

- **login:** right and wrong passwords, locked accounts refused, every demo account on ED25519, no password column
- **role:** nothing readable before `SET ROLE`
- **deny:** `SELECT`, `INSERT` and `UPDATE` on the tables refused, `register_user` refused for players, lookup tables still readable
- **views:** each user sees only their own games and sheets, backstories shown or hidden correctly, the GM sees all
- **register:** sign-up works, creates an ED25519 account, refuses bad names, SQL injection attempts and short passwords, and leaves nothing behind when refused
- **rules:** wrong join codes, GMs joining their own game, double joins, GM characters, illegal race and profession pairs, a wrong Vampire attribute spread, changing someone else's character
- **cyberpunk:** a hidden real name is hidden from other players but not from the owner or the GM
- **schema:** `CHECK` constraints refuse bad data even for root

**Proof that `DENY` does the work:** running the same tests against a server without the `DENY` lines (MariaDB 10.11, which has no `DENY`) gives 44 passed and 8 failed, and the 8 failures are exactly the `deny` group. Nothing else stands between a user and the tables.

## Things we ran into

- **`CREATE OR REPLACE DATABASE` fails with error 1451** when foreign key checks are on, because the old tables are dropped in no particular order. The schema switches the checks off for that one statement only.
- **A definer needs `EXECUTE` on its own routines.** Views and procedures run as `forge_owner`, so that locked account is granted `EXECUTE` on the schema; otherwise procedures calling `my_user_id()` fail.
- **`SET DEFAULT ROLE` for another user needs write access to the `mysql` database.** Rather than give `register_user` that, new accounts get no default role, and every session runs `SET ROLE forge_user` itself.
- **Inside a definer object, `USER()` and `CURRENT_USER()` differ.** `CURRENT_USER()` is the definer (`forge_owner`); `USER()` is the account that logged in. The views use `USER()`, which is what makes per-user filtering possible.

## The database

16 tables. Every character has one row in `characters` (shared fields) plus one row in its game's own table (an ISA hierarchy).

- **Shared:** `users`, `game_sessions`, `session_players` (who plays where), `characters`
- **The Witcher:** `witcher_characters`, `witcher_skills`, `witcher_character_skills`
- **Vampire:** `vtm_characters`, `vtm_skills`, `vtm_disciplines`, `vtm_clan_disciplines`, `vtm_character_skills`, `vtm_character_disciplines`
- **Cyberpunk:** `cyberpunk_characters`, `cyberpunk_skills`, `cyberpunk_character_skills`

| File | Contents |
|---|---|
| `sql/01_schema.sql` | Tables and constraints |
| `sql/02_seed.sql` | Skill lists for the three games, plus demo users, games and characters |
| `sql/03_accounts.sql` | Accounts, the role, `DENY` rules, `register_user` |
| `sql/04_views.sql` | The 12 views users read through |
| `sql/05_procedures.sql` | The procedures users write through |
| `tests/security_tests.sh` | The 52 checks |
| `docker-compose.yml`, `setup.bat` | Two ways to load it |

## Status

- **Done:** database, accounts and access rules, security tests with automatic runs on GitHub, and the website (home page, lobby, step-by-step creators for all three games, character sheets).
- **In progress:** a Python backend that connects to MariaDB **as the logged-in user**. Until it's finished, the website runs on an in-browser copy of the same rules (`js/api.js` mirrors each view and procedure), which is what the online demo uses.
- **Planned:** TLS with `REQUIRE SSL`, failed-login lockout (`max_password_errors`), the server audit log, and a comparison of ED25519 with the older `mysql_native_password`.

## Use of AI

AI (Claude, by Anthropic) was used during this project: for the website's HTML, CSS and JavaScript, for drafting parts of the SQL and the test script, and for explanations while learning. The design decisions (the game choice, account model, access rules and data model) are the author's, and every SQL file has been gone through and explained line by line.

## Licence

MIT, see [LICENSE](LICENSE). The Witcher, Vampire: The Masquerade and Cyberpunk belong to their publishers; this is a non-commercial student project.
