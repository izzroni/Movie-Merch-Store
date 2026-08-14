const git = require("../node_modules/isomorphic-git");
const http = require("../node_modules/isomorphic-git/http/node");
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..");
let remoteUrl = process.argv[2];
const token = process.argv[3];

if (!remoteUrl) {
  console.log("Usage: node push-to-github.js <GITHUB_REPO_URL> [PERSONAL_ACCESS_TOKEN]");
  process.exit(1);
}

if (token && remoteUrl.startsWith("https://") && !remoteUrl.includes("@")) {
  remoteUrl = remoteUrl.replace("https://", `https://${token}@`);
}

(async () => {
  try {
    const masterSha = await git.resolveRef({ fs, dir, ref: "master" }).catch(() => null);
    if (masterSha) {
      await git.writeRef({ fs, dir, ref: "refs/heads/main", value: masterSha, force: true }).catch(() => {});
    }

    const branchToPush = masterSha ? "master" : "main";
    console.log(`Setting remote origin: ${remoteUrl.replace(/https:\/\/[^@]+@/, "https://")}...`);

    try {
      await git.addRemote({ fs, dir, remote: "origin", url: remoteUrl });
    } catch (e) {
      await git.deleteRemote({ fs, dir, remote: "origin" }).catch(() => {});
      await git.addRemote({ fs, dir, remote: "origin", url: remoteUrl });
    }

    console.log(`Pushing project to GitHub...`);
    try {
      await git.push({
        fs,
        http,
        dir,
        remote: "origin",
        ref: branchToPush,
        onAuth: () => ({ username: token || "git", password: token || "" }),
      });
    } catch (pushErr) {
      if (pushErr.message.includes("Could not find")) {
        await git.push({
          fs,
          http,
          dir,
          remote: "origin",
          ref: "main",
          onAuth: () => ({ username: token || "git", password: token || "" }),
        });
      } else {
        throw pushErr;
      }
    }

    console.log("==========================================");
    console.log("🎉 Successfully pushed project to GitHub!");
    console.log("==========================================");
  } catch (err) {
    console.error("Push error:", err.message);
  }
})();
