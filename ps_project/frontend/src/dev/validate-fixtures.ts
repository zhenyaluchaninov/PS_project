import fs from "fs";
import path from "path";
import { parseAdventureDto } from "../domain/mappers";

function readFixture(fileName: string) {
  const fixturePath = path.resolve(__dirname, "..", "fixtures", fileName);
  const file = fs.readFileSync(fixturePath, "utf-8");
  return JSON.parse(file);
}

function validateAdventureFixture(fileName: string) {
  const payload = readFixture(fileName);
  const result = parseAdventureDto(payload);

  if (result.ok) {
    console.log(`[OK] ${fileName} parsed into domain model`, {
      title: result.data.title,
      nodes: result.data.nodes.length,
      links: result.data.links.length,
    });
  } else {
    console.error(`[FAIL] ${fileName} validation failed: ${result.error}`);
    console.error(result.issues);
    process.exitCode = 1;
  }
}

validateAdventureFixture("adventure.sample.json");
