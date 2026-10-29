#!/usr/bin/env bash
#
# Three-way merge driver for PO files, runs on multiple CPUs where possible
#
# Copyright 2015-2016 Marco Ciampa
# Copyright 2021 Mikko Rantalainen <mikko.rantalainen@iki.fi>
# License: MIT (https://opensource.org/licenses/MIT)
#
# Original source:
# https://stackoverflow.com/a/29535676/334451
# https://github.com/mezis/git-whistles/blob/master/libexec/git-merge-po.sh
#
# Install with:
# git config merge.merge-po-files.driver "./bin/merge-po-files.sh %A %O %B %P"
#
# And add to .gitattributes:
# languages/*.po merge=merge-po-files

##########################################################################
# CONFIG:

# Formatting flags to be be used to produce merged .po files
# NOTE: $MSGCAT_FINAL_FLAGS will be passed to msgcat without quotation
MSGCAT_FINAL_FLAGS="--no-wrap --sort-output"

# Verbosity level:
# 0: Silent except for real errors
# 1: Show simple header for each file processed
# 2: Also show all conflicts in merge result (both new and existing)
# 3: Also show all status messages with timestamps
VERBOSITY="${VERBOSITY:=2}"

##########################################################################
# Implementation:

LOCAL="$1"
BASE="$2"
OTHER="$3"
FILENAME="$4"
OUTPUT="$LOCAL"
TEMP="$(mktemp -d "${TMPDIR:-/tmp}/merge-po.XXXXXX")"

set -E
set -e

on_error() {
	local parent_lineno="$1"
	local code="$2"
	local message="${3:-}"

	if [[ -n "$message" ]]; then
		printf '### %s: error near line %d: status %d: %s\n' "$0" "$parent_lineno" "$code" "$message" 1>&2
	else
		printf '### %s: error near line %d: status %d\n' "$0" "$parent_lineno" "$code" 1>&2
	fi

	exit 255
}

cleanup() {
	if [[ -n "${TEMP:-}" && -d "${TEMP:-}" ]]; then
		rm -f "${TEMP}"/*
		rmdir "$TEMP"
	fi
}

trap 'on_error ${LINENO} $?' ERR
trap cleanup EXIT

status() {
	if [[ "$VERBOSITY" -ge 3 ]]; then
		printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
	fi
}

apply_po_template() {
	msgmerge --force-po --quiet --no-fuzzy-matching "$@"
}

strip_graveyard() {
	msgattrib --no-obsolete
}

only_conflicts() {
	msggrep --msgstr -F -e '#-#-#-#-#' -
}

without_conflicts() {
	msggrep -v --msgstr -F -e '#-#-#-#-#' -
}

extract_changes() {
	msgcat -o - "$1" "$2" \
		| only_conflicts \
		| apply_po_template -o - "$1" - \
		| strip_graveyard
}

extract_header() {
	msggrep --force-po -N // "$@"
}

show_conflicts() {
	OUTPUT_FILE="$1"
	CONFLICT_HEADER_LINES=$(cat "$OUTPUT_FILE" | msggrep --force-po --color=never --msgstr -F -e '#-#-#-#-#' - | extract_header - | wc -l)
	CONFLICTS=$(cat "$OUTPUT_FILE" | msggrep --force-po --color --msgstr -F -e '#-#-#-#-#' - | tail -n "+$((CONFLICT_HEADER_LINES + 1))")

	if [[ -n "$CONFLICTS" ]]; then
		echo '----------------------------'
		printf '%s\n' "$CONFLICTS"
		echo '----------------------------'
	fi
}

for command_name in msgcat msgmerge msguniq msgattrib msggrep; do
	if ! command -v "$command_name" >/dev/null 2>&1; then
		printf 'Missing required gettext command: %s\n' "$command_name" >&2
		exit 1
	fi
done

[[ -n "$TEMP" ]] || exit 125
[[ -d "$TEMP" ]] || exit 126
[[ -w "$TEMP" ]] || exit 127

if [[ "$VERBOSITY" -ge 1 ]]; then
	printf 'Using gettext .PO merge driver: %s ...\n' "$FILENAME"
fi

extract_header -o "${TEMP}/header" "$LOCAL"

status "Canonicalizing input files ..."
msguniq --force-po -o "${TEMP}/base" --unique "${BASE}" &
msguniq --force-po -o "${TEMP}/local" --unique "${LOCAL}" &
msguniq --force-po -o "${TEMP}/other" --unique "${OTHER}" &
wait

status "Computing local-changes, other-changes and unchanged ..."
msgcat --force-po -o - "${TEMP}/base" "${TEMP}/local" "${TEMP}/other" | without_conflicts > "${TEMP}/unchanged" &
extract_changes "${TEMP}/local" "${TEMP}/base" > "${TEMP}/local-changes" &
extract_changes "${TEMP}/other" "${TEMP}/base" > "${TEMP}/other-changes" &
wait

status "Computing conflicts ..."
msgcat --force-po -o - "${TEMP}/other-changes" "${TEMP}/local-changes" | only_conflicts > "${TEMP}/conflicts"

status "Computing local-only and other-only changes ..."
msgcat --force-po -o "${TEMP}/local-only" --unique "${TEMP}/local-changes" "${TEMP}/conflicts" &
msgcat --force-po -o "${TEMP}/other-only" --unique "${TEMP}/other-changes" "${TEMP}/conflicts" &
wait

status "Computing initial merge without template ..."
msgcat --force-po -o "${TEMP}/merge1" "${TEMP}/unchanged" "${TEMP}/conflicts" "${TEMP}/local-only" "${TEMP}/other-only"

status "Computing template and applying it to merge result ..."
msgcat --force-po -o - "${TEMP}/local" "${TEMP}/other" | apply_po_template -o "${TEMP}/merge2" "${TEMP}/merge1" -

status "Fixing the header after merge ..."
msgcat --force-po $MSGCAT_FINAL_FLAGS -o "${TEMP}/merge3" --use-first "${TEMP}/header" "${TEMP}/merge2"

status "Saving output ..."
mv "${TEMP}/merge3" "$OUTPUT"

status "Checking for conflicts in the result ..."

if grep -q '#-#-#-#-#' "$OUTPUT"; then
	if [[ "$VERBOSITY" -ge 1 ]]; then
		printf '### Conflict(s) detected ###\n'
	fi

	if [[ "$VERBOSITY" -ge 2 ]]; then
		show_conflicts "$OUTPUT"
	fi

	status "Automatic merge failed, exiting with status 1."
	exit 1
fi

status "Automatic merge completed successfully, exiting with status 0."
exit 0
