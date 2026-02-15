#!/bin/bash
set -a
source .env
set +a
exec npx tsx watch src/index.ts
