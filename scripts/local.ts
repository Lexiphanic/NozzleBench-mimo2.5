#!/usr/bin/env bun
import path from "path";
process.chdir(path.resolve(import.meta.dir, ".."));


const MODEL = "opencode-go/mimo-v2.5";

const PROMPT = `Find something to improve the project - you can look at existing issues in github issues or if it's a new unit of work, ensure a github issue is created first for it. Use subagents to maximise output. Each subagent must use worktrees. Once their work is completed and wants to be merged (remember to close github issues where applicable), you can then check it and merge it to main (checking and fixing conflicts where required.) Make sure to commit or stash before stopping so the branch should be clean at the end.`;

function getGeneration(): number {
  const out = Bun.spawnSync(["git", "tag", "-l", "generation-*"]).stdout.toString().trim();
  if (!out) return 0;
  const nums = out
    .split("\n")
    .map((t) => parseInt(t.replace("generation-", ""), 10));
  return Math.max(...nums);
}

let generation = getGeneration();
console.log(`Starting from generation ${generation}`);

while (true) {
  generation++;
  console.log(`\n=== Generation ${generation} ===`);

  const omp = Bun.spawn(["omp", "--models", MODEL, "--model", MODEL, "--smol", MODEL, "--slow", MODEL, "--plan", MODEL, "--auto-approve", "-p", PROMPT], {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });
  await omp.exited;

  await Bun.$`git add -A`.quiet();
  await Bun.$`git commit -m ${`generation ${generation}`} --allow-empty`.quiet();
  await Bun.$`git tag generation-${generation}`;
  await Bun.$`git push origin main`;
  await Bun.$`git push origin generation-${generation}`;
  await Bun.$`git stash --include-untracked`.quiet();

  console.log(`Generation ${generation} complete`);
}
