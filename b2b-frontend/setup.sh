#!/bin/bash
set -euo pipefail

# ─── Setup script for b2b-frontend (Next.js) on Ubuntu ───
# Must be run as root (sudo)

if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: This script must be run as root (sudo ./setup.sh)"
    exit 1
fi

SERVICE_USER="mmlb2bfr"
SERVICE_NAME="mml-b2b-frontend"
LOG_DIR="/var/log/makemelook"
LOG_FILE="${LOG_DIR}/b2b-frontend.log"

# Resolve project directory from the location of this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

echo "=== b2b-frontend setup ==="
echo "Project directory: ${PROJECT_DIR}"

# ─── 1. Create user ───
if id "$SERVICE_USER" &>/dev/null; then
    echo "User '${SERVICE_USER}' already exists, skipping creation."
else
    echo "Creating user '${SERVICE_USER}'..."
    PASSWORD=$(openssl rand -base64 12)
    useradd --system --create-home --shell /bin/bash "$SERVICE_USER"
    echo "${SERVICE_USER}:${PASSWORD}" | chpasswd
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║  User: ${SERVICE_USER}"
    echo "║  Password: ${PASSWORD}"
    echo "║  SAVE THIS PASSWORD — it won't be shown again!"
    echo "╚══════════════════════════════════════════╝"
    echo ""
fi

# ─── 2. Create log directory ───
echo "Creating log directory: ${LOG_DIR}"
mkdir -p "$LOG_DIR"
chown "$SERVICE_USER":"$SERVICE_USER" "$LOG_DIR"
chmod 755 "$LOG_DIR"

touch "$LOG_FILE"
chown "$SERVICE_USER":"$SERVICE_USER" "$LOG_FILE"
chmod 644 "$LOG_FILE"

# ─── 3. Set project file permissions (read-only for service user) ───
echo "Setting project file permissions (read-only + execute where needed)..."
chown -R "$SERVICE_USER":"$SERVICE_USER" "$PROJECT_DIR"
# Files: read-only
find "$PROJECT_DIR" -type f -exec chmod 444 {} +
# Directories: read + execute (traverse), NO write
find "$PROJECT_DIR" -type d -exec chmod 555 {} +
# .next/cache needs write access for Next.js runtime
if [ -d "${PROJECT_DIR}/.next/cache" ]; then
    find "${PROJECT_DIR}/.next/cache" -type d -exec chmod 755 {} +
    find "${PROJECT_DIR}/.next/cache" -type f -exec chmod 644 {} +
fi

# ─── 3a. Widget files directory (writable by backend user) ───
BACKEND_USER="mmlbackend"
WIDGET_FILES_DIR="${PROJECT_DIR}/public/widget/files"
echo "Setting up widget files directory: ${WIDGET_FILES_DIR}"
mkdir -p "$WIDGET_FILES_DIR"
chown -R "$BACKEND_USER":"$BACKEND_USER" "$WIDGET_FILES_DIR"
chmod 755 "$WIDGET_FILES_DIR"

# ─── 4. Create systemd unit ───
UNIT_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
echo "Creating systemd unit: ${UNIT_FILE}"

cat > "$UNIT_FILE" <<EOF
[Unit]
Description=MakeMeLook B2B Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${PROJECT_DIR}
ExecStart=/usr/bin/node ${PROJECT_DIR}/node_modules/.bin/next start -p 5005
Restart=on-failure
RestartSec=5

Environment=NODE_ENV=production
Environment=PORT=5005

StandardOutput=append:${LOG_FILE}
StandardError=append:${LOG_FILE}

# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadOnlyPaths=${PROJECT_DIR}
ReadWritePaths=${PROJECT_DIR}/.next/cache ${PROJECT_DIR}/public/widget/files ${LOG_DIR}
PrivateTmp=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true

[Install]
WantedBy=multi-user.target
EOF

# ─── 5. Allow service user to restart ONLY this unit (no other sudo) ───
SUDOERS_FILE="/etc/sudoers.d/${SERVICE_USER}"
echo "Configuring sudoers: ${SUDOERS_FILE}"

cat > "$SUDOERS_FILE" <<EOF
# Allow ${SERVICE_USER} to restart only ${SERVICE_NAME} service
${SERVICE_USER} ALL=(root) NOPASSWD: /usr/bin/systemctl restart ${SERVICE_NAME}.service
${SERVICE_USER} ALL=(root) NOPASSWD: /usr/bin/systemctl status ${SERVICE_NAME}.service
EOF
chmod 440 "$SUDOERS_FILE"

# ─── 6. Enable and start service ───
echo "Enabling and starting ${SERVICE_NAME}..."
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"

echo ""
echo "=== Setup complete ==="
echo "Service status: systemctl status ${SERVICE_NAME}"
echo "Logs: tail -f ${LOG_FILE}"
