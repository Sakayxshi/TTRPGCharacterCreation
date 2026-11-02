#!/usr/bin/env bash
# Security tests for the ttrpg_forge database.
#
# Logs in as each demo account and checks that what should work works,
# and that what should be refused is refused. Run it where the MariaDB
# client can reach the server through its local socket, because every
# account is 'name'@'localhost'. With Docker:
#
#   docker compose exec db bash /tests/security_tests.sh
#
# Expects a freshly loaded database (sql/01 to sql/05). New users made
# by the tests get a random suffix, so the script can be run again.
# Exit code: 0 if every check passes, 1 otherwise.

set -u

ROOT_PW="${MARIADB_ROOT_PASSWORD:-}"
DB="ttrpg_forge"
RUN_ID="$RANDOM$RANDOM"
PASS=0
FAIL=0
FAILED_NAMES=()

GREEN=$'\e[32m'; RED=$'\e[31m'; DIM=$'\e[2m'; OFF=$'\e[0m'
[ -t 1 ] || { GREEN=""; RED=""; DIM=""; OFF=""; }

# --- how we talk to the server -------------------------------------------

as_root() {
  mariadb -u root ${ROOT_PW:+-p"$ROOT_PW"} --batch --skip-column-names -e "$1" 2>&1
}

# as_user USER PASSWORD SQL  - logs in, switches on the forge_user role, runs SQL
as_user() {
  mariadb -u "$1" -p"$2" --batch --skip-column-names -e "SET ROLE forge_user; $3" 2>&1
}

# as_user_norole USER PASSWORD SQL  - same, but without switching on the role
as_user_norole() {
  mariadb -u "$1" -p"$2" --batch --skip-column-names -e "$3" 2>&1
}

record() {  # record OK|BAD SECTION DESCRIPTION DETAIL
  if [ "$1" = OK ]; then
    PASS=$((PASS + 1)); printf '%sPASS%s  %-14s %s\n' "$GREEN" "$OFF" "$2" "$3"
  else
    FAIL=$((FAIL + 1)); FAILED_NAMES+=("$2: $3")
    printf '%sFAIL%s  %-14s %s\n' "$RED" "$OFF" "$2" "$3"
    printf '      %sgot: %s%s\n' "$DIM" "$(printf '%s' "$4" | head -3 | tr '\n' ' ')" "$OFF"
  fi
}

# expect_value SECTION DESCRIPTION EXPECTED OUTPUT
expect_value() {
  if [ "$4" = "$3" ]; then record OK "$1" "$2" ""; else record BAD "$1" "$2" "expected '$3', $4"; fi
}

# expect_error SECTION DESCRIPTION PATTERN OUTPUT  - output must be an error matching PATTERN
expect_error() {
  if printf '%s' "$4" | grep -q '^ERROR' && printf '%s' "$4" | grep -Eqi "$3"; then
    record OK "$1" "$2" ""
  else
    record BAD "$1" "$2" "expected an error matching '$3', $4"
  fi
}

# expect_success SECTION DESCRIPTION OUTPUT  - output must not contain an error
expect_success() {
  if printf '%s' "$3" | grep -q '^ERROR'; then record BAD "$1" "$2" "$3"; else record OK "$1" "$2" ""; fi
}

CIRI=(player_ciri demo-ciri-2026)
LAMBERT=(player_lambert demo-lambert-2026)
VESEMIR=(gm_vesemir demo-vesemir-2026)
ZOLTAN=(outsider_zoltan demo-zoltan-2026)
REGISTRAR=(forge_registrar demo-registrar-2026)

echo "MariaDB $(as_root 'SELECT VERSION()')"
echo

# --- 1. Logging in ----------------------------------------------------------
S="login"
expect_value   $S "player_ciri logs in with the right password" "player_ciri@localhost" \
  "$(as_user_norole "${CIRI[@]}" 'SELECT USER()')"
expect_error   $S "a wrong password is refused" "access denied" \
  "$(as_user_norole player_ciri wrong-password-1 'SELECT 1')"
expect_error   $S "forge_owner is locked and can't log in" "locked|access denied" \
  "$(mariadb -u forge_owner --batch -e 'SELECT 1' 2>&1)"
expect_error   $S "forge_admin is locked and can't log in" "locked|access denied" \
  "$(mariadb -u forge_admin --batch -e 'SELECT 1' 2>&1)"
expect_value   $S "demo accounts use the ed25519 plugin" "5" \
  "$(as_root "SELECT COUNT(*) FROM mysql.global_priv WHERE Host='localhost'
     AND User IN ('player_ciri','player_lambert','gm_vesemir','outsider_zoltan','forge_registrar')
     AND JSON_VALUE(Priv,'$.plugin') = 'ed25519'")"
expect_value   $S "the users table has no password column" "0" \
  "$(as_root "SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA='$DB' AND TABLE_NAME='users' AND COLUMN_NAME LIKE '%pass%'")"

# --- 2. Roles ---------------------------------------------------------------
S="role"
expect_error   $S "without SET ROLE a user can read nothing" "denied" \
  "$(as_user_norole "${CIRI[@]}" "SELECT COUNT(*) FROM $DB.my_sessions")"
expect_success $S "with SET ROLE forge_user the views open" \
  "$(as_user "${CIRI[@]}" "SELECT COUNT(*) FROM $DB.my_sessions")"

# --- 3. DENY: no direct access to the tables --------------------------------
S="deny"
for t in users game_sessions session_players characters witcher_characters vtm_characters cyberpunk_characters; do
  expect_error $S "SELECT on table $t is refused" "denied" \
    "$(as_user "${CIRI[@]}" "SELECT * FROM $DB.$t LIMIT 1")"
done
expect_error   $S "INSERT into characters is refused" "denied" \
  "$(as_user "${CIRI[@]}" "INSERT INTO $DB.characters (owner_id, session_id, name, gender) VALUES (2, 3, 'x', 'male')")"
expect_error   $S "UPDATE on users is refused" "denied" \
  "$(as_user "${CIRI[@]}" "UPDATE $DB.users SET username = 'hacked' WHERE user_id = 1")"
expect_error   $S "a player can't call register_user (DENY EXECUTE)" "denied" \
  "$(as_user "${CIRI[@]}" "CALL $DB.register_user('sneaky_$RUN_ID', 'password-123')")"
expect_success $S "the lookup tables stay readable" \
  "$(as_user "${CIRI[@]}" "SELECT COUNT(*) FROM $DB.witcher_skills")"

# --- 4. Views: everyone sees only their own part ----------------------------
S="views"
expect_value   $S "me shows the logged-in user only" "player_ciri" \
  "$(as_user "${CIRI[@]}" "SELECT username FROM $DB.me")"
expect_value   $S "Ciri sees her 3 games" "3" \
  "$(as_user "${CIRI[@]}" "SELECT COUNT(*) FROM $DB.my_sessions")"
expect_value   $S "Zoltan (in no game) sees 0 games" "0" \
  "$(as_user "${ZOLTAN[@]}" "SELECT COUNT(*) FROM $DB.my_sessions")"
expect_value   $S "Zoltan sees no characters at all" "0" \
  "$(as_user "${ZOLTAN[@]}" "SELECT COUNT(*) FROM $DB.party_characters")"
expect_value   $S "Ciri's full sheets are only her own two" "1,3" \
  "$(as_user "${CIRI[@]}" "SELECT GROUP_CONCAT(char_id ORDER BY char_id) FROM $DB.full_characters")"
expect_value   $S "Ciri gets no full sheet for Lambert" "0" \
  "$(as_user "${CIRI[@]}" "SELECT COUNT(*) FROM $DB.full_witcher_characters WHERE char_id = 2")"
expect_value   $S "the GM gets every full sheet in his games" "1,2,3" \
  "$(as_user "${VESEMIR[@]}" "SELECT GROUP_CONCAT(char_id ORDER BY char_id) FROM $DB.full_characters")"
expect_value   $S "Ciri can read Lambert's shared backstory" "1" \
  "$(as_user "${CIRI[@]}" "SELECT lore IS NOT NULL FROM $DB.party_characters WHERE char_id = 2")"
expect_value   $S "Lambert can't read Ciri's private backstory" "1" \
  "$(as_user "${LAMBERT[@]}" "SELECT lore IS NULL FROM $DB.party_characters WHERE char_id = 1")"
expect_value   $S "the GM reads the private backstory" "1" \
  "$(as_user "${VESEMIR[@]}" "SELECT lore IS NOT NULL FROM $DB.party_characters WHERE char_id = 1")"

# --- 5. Signing up through register_user ------------------------------------
S="register"
NEW1="tester_a_$RUN_ID"; NEW2="tester_b_$RUN_ID"; PW="long-test-password"
expect_success $S "forge_registrar can create a new account" \
  "$(mariadb -u "${REGISTRAR[0]}" -p"${REGISTRAR[1]}" --batch -e "CALL $DB.register_user('$NEW1', '$PW')" 2>&1)"
mariadb -u "${REGISTRAR[0]}" -p"${REGISTRAR[1]}" --batch -e "CALL $DB.register_user('$NEW2', '$PW')" >/dev/null 2>&1
expect_value   $S "the new account logs in and sees itself" "$NEW1" \
  "$(as_user "$NEW1" "$PW" "SELECT username FROM $DB.me")"
expect_value   $S "the new account is ed25519 too" "ed25519" \
  "$(as_root "SELECT JSON_VALUE(Priv,'$.plugin') FROM mysql.global_priv WHERE User='$NEW1'")"
expect_error   $S "a bad username is refused" "3-32 characters" \
  "$(mariadb -u "${REGISTRAR[0]}" -p"${REGISTRAR[1]}" --batch -e "CALL $DB.register_user('Bad Name!', '$PW')" 2>&1)"
expect_error   $S "a name with quotes (SQL injection) is refused" "3-32 characters" \
  "$(mariadb -u "${REGISTRAR[0]}" -p"${REGISTRAR[1]}" --batch -e "CALL $DB.register_user('x''@''%', '$PW')" 2>&1)"
expect_error   $S "a short password is refused" "at least 10" \
  "$(mariadb -u "${REGISTRAR[0]}" -p"${REGISTRAR[1]}" --batch -e "CALL $DB.register_user('short_pw_$RUN_ID', 'short')" 2>&1)"
expect_value   $S "a refused sign-up leaves no account behind" "0" \
  "$(as_root "SELECT COUNT(*) FROM mysql.global_priv WHERE User='short_pw_$RUN_ID'")"
expect_error   $S "forge_registrar can't read any data" "denied" \
  "$(mariadb -u "${REGISTRAR[0]}" -p"${REGISTRAR[1]}" --batch -e "SELECT * FROM $DB.my_sessions" 2>&1)"

# --- 6. Game rules inside the procedures ------------------------------------
S="rules"
expect_error   $S "joining with a wrong code is refused" "No session" \
  "$(as_user "$NEW1" "$PW" "CALL $DB.join_session('ZZZZZZ')")"
expect_error   $S "the GM can't join his own game" "GM" \
  "$(as_user "${VESEMIR[@]}" "CALL $DB.join_session('KMR7Q2')")"
expect_error   $S "joining the same game twice is refused" "already" \
  "$(as_user "${CIRI[@]}" "CALL $DB.join_session('KMR7Q2')")"
expect_error   $S "the GM can't make a character in his own game" "foreign key|not a player|denied|fk_char_player" \
  "$(as_user "${VESEMIR[@]}" "CALL $DB.create_witcher_character(1,'Vesemir',90,'male',NULL,'witcher','witcher',NULL,NULL,NULL,6,8,8,7,7,2,6,7,5,100)")"
expect_error   $S "a human can't be a Witcher" "witcher" \
  "$(as_user "$NEW1" "$PW" "CALL $DB.join_session('KMR7Q2'); CALL $DB.create_witcher_character(1,'Fake',30,'male',NULL,'human','witcher',NULL,NULL,NULL,6,8,8,7,7,2,6,7,5,100)")"
expect_error   $S "gender must be male or female" "male or female" \
  "$(as_user "$NEW1" "$PW" "CALL $DB.create_witcher_character(1,'Odd',30,'other',NULL,'human','bard',NULL,NULL,NULL,6,8,8,7,7,2,6,7,5,100)")"
expect_error   $S "a wrong Vampire attribute spread is refused" "one at 4|spread|Attributes" \
  "$(as_user "$NEW1" "$PW" "CALL $DB.join_session('CHGNYT'); CALL $DB.create_vtm_character(3,'Bad',30,'male',NULL,'brujah','x',NULL,NULL,NULL,NULL,13,'alleycat',6,5,5,5,5,5,5,5,5,5,NULL,NULL,NULL,NULL)")"
expect_error   $S "changing someone else's backstory is refused" "Not your character" \
  "$(as_user "${CIRI[@]}" "CALL $DB.set_lore_visible(2, FALSE)")"

# --- 7. Cyberpunk: hidden real name ----------------------------------------
S="cyberpunk"
CP_ARGS="'Mira Santos','Glitch_$RUN_ID',FALSE,TRUE,22,'female',NULL,'netrunner',7,7,7,7,7,7,6,6,6,NULL,NULL,NULL,NULL,2000"
expect_error   $S "hiding both name and handle is refused" "at least the name or the handle" \
  "$(as_user "$NEW1" "$PW" "CALL $DB.join_session('NC2020'); CALL $DB.create_cyberpunk_character(2,'A','B',FALSE,FALSE,22,'female',NULL,'netrunner',7,7,7,7,7,7,6,6,6,NULL,NULL,NULL,NULL,2000)")"
expect_success $S "a character with a hidden real name is saved" \
  "$(as_user "$NEW1" "$PW" "CALL $DB.create_cyberpunk_character(2,$CP_ARGS)")"
as_user "$NEW2" "$PW" "CALL $DB.join_session('NC2020')" >/dev/null
expect_value   $S "another player sees the handle, not the name" "NULL	Glitch_$RUN_ID" \
  "$(as_user "$NEW2" "$PW" "SELECT IFNULL(name,'NULL'), handle FROM $DB.party_characters WHERE handle = 'Glitch_$RUN_ID'")"
expect_value   $S "the GM sees the real name" "Mira Santos" \
  "$(as_user "${LAMBERT[@]}" "SELECT name FROM $DB.party_characters WHERE handle = 'Glitch_$RUN_ID'")"
expect_value   $S "the owner sees the real name" "Mira Santos" \
  "$(as_user "$NEW1" "$PW" "SELECT name FROM $DB.party_characters WHERE handle = 'Glitch_$RUN_ID'")"

# --- 8. Rules in the table definitions --------------------------------------
S="schema"
expect_error   $S "CHECK refuses a bad username even for root" "constraint|chk_username" \
  "$(as_root "INSERT INTO $DB.users (username) VALUES ('Bad Name!')")"
expect_error   $S "CHECK refuses a Witcher stat above 13" "constraint" \
  "$(as_root "UPDATE $DB.witcher_characters SET stat_luck = 20 WHERE char_id = 1")"

# --- summary ----------------------------------------------------------------
echo
echo "$PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  printf '  - %s\n' "${FAILED_NAMES[@]}"
  exit 1
fi
