import path from "node:path";

import { rootDir } from "./workspace-utils.mjs";
import { releaseArtifactName } from "./release-config.mjs";
import { assertReleaseBundleContents } from "./release-bundle-utils.mjs";

const archivePath = path.join(rootDir, "artifacts", "release", releaseArtifactName);
const result = assertReleaseBundleContents(archivePath);

console.log(
  JSON.stringify(
    {
      ok: true,
      archive: path.relative(rootDir, archivePath),
      ...result
    },
    null,
    2
  )
);
