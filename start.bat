@echo off
echo Uploading patch notes...
node scripts/upload-patch-notes.js
if %errorlevel% neq 0 (
  echo Patch notes upload failed - continuing anyway
)
echo Starting Fish Frenzy...
start index.html
