#!/usr/bin/env node
/**
 * Git マージコンフリクトマーカー一括除去スクリプト
 * 使用方法: node scripts/fix-conflicts.js
 * 
 * <<<<<<< HEAD, =======, >>>>>>> branch の行を削除し、
 * より新しい・シンプルな方（1.5秒タイムアウト等）を残します。
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.css', '.json']
const EXCLUDE_DIRS = ['node_modules', '.next', '.git', 'dist', 'build']

function getAllFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  const items = fs.readdirSync(dir)
  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(item)) {
        getAllFiles(fullPath, files)
      }
    } else if (EXTENSIONS.some(ext => item.endsWith(ext))) {
      files.push(fullPath)
    }
  }
  return files
}

function resolveConflict(content, filePath) {
  const lines = content.split('\n')
  const result = []
  let inConflict = false
  let headBlock = []
  let otherBlock = []
  let keepHead = true

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith('<<<<<<<')) {
      inConflict = true
      headBlock = []
      otherBlock = []
      keepHead = true
      continue
    }
    if (trimmed === '=======') {
      keepHead = false
      continue
    }
    if (trimmed.startsWith('>>>>>>>')) {
      inConflict = false
      // よりシンプルな方（HEAD）を優先（1.5秒タイムアウト等）
      const chosen = headBlock.length > 0 ? headBlock : otherBlock
      result.push(...chosen)
      continue
    }

    if (inConflict) {
      if (keepHead) headBlock.push(line)
      else otherBlock.push(line)
    } else {
      result.push(line)
    }
  }

  return result.join('\n')
}

function hasConflictMarkers(content) {
  return /^<<<<<<<|^=======$|^>>>>>>>/m.test(content)
}

function main() {
  const files = getAllFiles(ROOT)
  let fixedCount = 0

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    if (hasConflictMarkers(content)) {
      const resolved = resolveConflict(content, file)
      fs.writeFileSync(file, resolved)
      fixedCount++
      console.log('Fixed:', path.relative(ROOT, file))
    }
  }

  if (fixedCount === 0) {
    console.log('No conflict markers found. All files are clean.')
  } else {
    console.log(`\nResolved conflicts in ${fixedCount} file(s).`)
  }
}

main()
