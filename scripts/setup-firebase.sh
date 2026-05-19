#!/usr/bin/env bash
# Create a Firebase project and wire .firebaserc for Sting hosting.
# Requires: firebase-tools, `firebase login`, and a Google account with permission to create GCP projects.
#
# Usage:
#   ./scripts/setup-firebase.sh                    # prompts for project id
#   ./scripts/setup-firebase.sh stingweb           # project id = stingweb
#   STING_FIREBASE_PROJECT=stingweb ./scripts/setup-firebase.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_ID="${1:-${STING_FIREBASE_PROJECT:-}}"
DISPLAY_NAME="${STING_FIREBASE_DISPLAY_NAME:-Sting}"

if ! command -v firebase >/dev/null 2>&1; then
  echo "Install Firebase CLI: npm install -g firebase-tools"
  exit 1
fi

if ! firebase login:list 2>/dev/null | grep -q 'Logged in'; then
  echo "Run: firebase login"
  exit 1
fi

if [[ -z "$PROJECT_ID" ]]; then
  read -r -p "Firebase project id (lowercase, e.g. stingweb): " PROJECT_ID
fi

PROJECT_ID="$(echo "$PROJECT_ID" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-')"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Project id is required."
  exit 1
fi

if firebase projects:list 2>/dev/null | grep -q "$PROJECT_ID"; then
  echo "Project already exists: $PROJECT_ID"
else
  echo "Creating Firebase project: $PROJECT_ID"
  firebase projects:create "$PROJECT_ID" --display-name "$DISPLAY_NAME"
fi

firebase use "$PROJECT_ID" --add

cat > .firebaserc <<EOF
{
  "projects": {
    "default": "$PROJECT_ID"
  }
}
EOF

echo ""
echo "Wired .firebaserc to project: $PROJECT_ID"
echo ""
echo "If this is a new project, open the Firebase console once and enable billing if prompted:"
echo "  https://console.firebase.google.com/project/$PROJECT_ID/overview"
echo ""
echo "Then deploy:"
echo "  npm run deploy:firebase"
echo ""
echo "Site URL (after deploy): https://${PROJECT_ID}.web.app"
