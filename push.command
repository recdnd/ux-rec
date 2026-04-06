#!/bin/bash
"$(cd "$(dirname "$0")" && pwd)/自動push.command"
EOF && chmod +x "push.command" && xattr -d com.apple.quarantine "自動push.command" 2>/dev/null || true && xattr -d com.apple.quarantine "push.command" 2>/dev/null || true