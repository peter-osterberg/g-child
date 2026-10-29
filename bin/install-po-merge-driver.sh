#!/bin/bash

set -euo pipefail

echo "Configuring PO merge driver..."

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
	echo "Not a git repo; skipping PO merge driver setup."
	exit 0
fi

chmod +x bin/merge-po-files.sh

git config merge.merge-po-files.name "Gettext PO merge driver"
git config merge.merge-po-files.driver "./bin/merge-po-files.sh %A %O %B %P"

echo "PO merge driver configured successfully."
