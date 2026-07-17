#!/usr/bin/env node
/**
 * Compute a combined line-coverage percentage across the frontend (Jest) and
 * backend (pytest) suites and emit a shields.io "endpoint" badge JSON on stdout.
 *
 * No external service: CI publishes this JSON to the orphan `badges` branch and
 * the README badge reads it via https://img.shields.io/endpoint. See ci.yml.
 *
 * The label is deliberately "coverage (backend + logic)", not "coverage": the
 * Jest side of this number measures `src/lib` only (see collectCoverageFrom in
 * jest.config.js) because React components are covered by Playwright + axe
 * instead, and Playwright coverage is not in this denominator. A bare
 * "coverage" label would imply the whole repo and overstate what ran.
 *
 * Usage: node scripts/coverage-badge.mjs <frontend-summary.json> <backend-coverage.xml>
 * Missing/unreadable inputs are skipped so the badge still renders from whatever
 * coverage is available.
 */
import { readFileSync } from 'node:fs'

function frontendLines(path) {
  try {
    const total = JSON.parse(readFileSync(path, 'utf8')).total.lines
    return { covered: total.covered, valid: total.total }
  } catch {
    return { covered: 0, valid: 0 }
  }
}

function backendLines(path) {
  try {
    // Cobertura root: <coverage ... lines-covered="N" lines-valid="M" ...>
    const xml = readFileSync(path, 'utf8')
    const covered = Number(xml.match(/lines-covered="(\d+)"/)?.[1] ?? 0)
    const valid = Number(xml.match(/lines-valid="(\d+)"/)?.[1] ?? 0)
    return { covered, valid }
  } catch {
    return { covered: 0, valid: 0 }
  }
}

function color(pct) {
  if (pct >= 90) return 'brightgreen'
  if (pct >= 80) return 'green'
  if (pct >= 70) return 'yellowgreen'
  if (pct >= 60) return 'yellow'
  if (pct >= 50) return 'orange'
  return 'red'
}

const [, , fePath, bePath] = process.argv
const fe = frontendLines(fePath)
const be = backendLines(bePath)
const covered = fe.covered + be.covered
const valid = fe.valid + be.valid
const pct = valid === 0 ? 0 : Math.round((covered / valid) * 1000) / 10

process.stdout.write(
  JSON.stringify({
    schemaVersion: 1,
    label: 'coverage (backend + logic)',
    message: `${pct}%`,
    color: color(pct),
  })
)
