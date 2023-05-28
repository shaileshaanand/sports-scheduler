#!/bin/sh
export DATABASE_URL=$TEST_DATABASE_URL
export NODE_ENV=test
npx prisma migrate deploy
npx vitest --no-threads $1
