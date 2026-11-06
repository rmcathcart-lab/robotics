#!/bin/bash
# captures every walk-through frame of the Fusion missions F2–F8 (node tests/f01_walk.js per mission)
cd "$(dirname "$0")/.."
node tests/f01_walk.js 3,4 f02; node tests/f01_walk.js 5,6 f02
node tests/f01_walk.js 3,4,5 f03
node tests/f01_walk.js 3,4,5,6 f04
node tests/f01_walk.js 3,4,5 f05
node tests/f01_walk.js 2,3,4,5 f06
node tests/f01_walk.js 3,4,5 f07
node tests/f01_walk.js 6 f08
