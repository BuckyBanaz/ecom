#!/usr/bin/env bash
# Wrapper — runs full Jenkins recovery.
exec "$(dirname "$0")/restart-jenkins-stack.sh"
