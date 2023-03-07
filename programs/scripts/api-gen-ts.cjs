// @ts-check
"use strict";

const fs = require("fs");
const path = require("path");
const programKeypairPath = path.join("/Users/mingyang/Desktop/Work/Admin/Projects/marketplace-sc-v2/target/deploy/marketplace_sc_v2-keypair.json");
const programIdKeypair = JSON.parse(fs.readFileSync(programKeypairPath, 'utf8'));
const { Keypair } = require("@solana/web3.js");
const publicKey = Keypair.fromSeed(Uint8Array.from(programIdKeypair.slice(0, 32))).publicKey.toBase58().toString();

// NOTE: ideally we'd rename the anchor program to gumdrop
const PROGRAM_NAME = "marketplace_sc_v2";
const PROGRAM_ID = publicKey;

const programDir = path.join(__dirname, "..", "programs/marketplace-sc-v2");

const generatedIdlDir = path.join(__dirname, "..", "target", "idl");
const generatedSDKDir = path.join(
  __dirname,
  "..",
  "packages/sdk",
  "src",
  "generated"
);
const configDir = path.join(
  __dirname,
  "..",
  "packages/sdk",
  "src",
  "config.ts"
)
const { spawn } = require("child_process");
const { Solita } = require("@metaplex-foundation/solita");
const { writeFile } = require("fs/promises");

const anchor = spawn("anchor", ["build", "--idl", generatedIdlDir], {
  shell: true,
  cwd: programDir,
})
  .on("error", (err) => {
    console.error(err);
    // @ts-ignore this err does have a code
    if (err.code === "ENOENT") {
      console.error(
        "Ensure that `anchor` is installed and in your path, see:\n  https://project-serum.github.io/anchor/getting-started/installation.html#install-anchor\n"
      );
    }
    process.exit(1);
  })
  .on("exit", () => {
    console.log(
      "IDL written to: %s",
      path.join(generatedIdlDir, `${PROGRAM_NAME}.json`)
    );
    generateTypeScriptSDK();
  });

anchor.stdout.on("data", (buf) => console.log(buf.toString("utf8")));
anchor.stderr.on("data", (buf) => console.error(buf.toString("utf8")));

async function generateTypeScriptSDK() {
  console.error("Generating TypeScript SDK to %s", generatedSDKDir);
  const generatedIdlPath = path.join(generatedIdlDir, `${PROGRAM_NAME}.json`);
  
  const idl = require(generatedIdlPath);
  if (idl.metadata?.address == null) {
    idl.metadata = { ...idl.metadata, address: PROGRAM_ID };
    await writeFile(generatedIdlPath, JSON.stringify(idl, null, 2));
  }
  const gen = new Solita(idl, { formatCode: true });
  await gen.renderAndWriteTo(generatedSDKDir)
  const configData = "export const programId = '" + publicKey + "'"
  await fs.writeFileSync(configDir, configData)

  console.error("Success!");

  process.exit(0);
}
