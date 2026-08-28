import assert from "node:assert/strict";
import { test } from "node:test";
import type { File } from "@google-cloud/storage";
import {
  canAccessObject,
  getObjectAclPolicy,
  ObjectPermission,
} from "./objectAcl";

function objectWithMetadata(value: string): File {
  return {
    getMetadata: async () => [{ metadata: { "custom:aclPolicy": value } }],
  } as unknown as File;
}

test("private ACL permits only the recorded owner", async () => {
  const objectFile = objectWithMetadata(
    JSON.stringify({ owner: "user-a", visibility: "private" }),
  );
  assert.equal(
    await canAccessObject({
      objectFile,
      userId: "user-a",
      requestedPermission: ObjectPermission.READ,
    }),
    true,
  );
  assert.equal(
    await canAccessObject({
      objectFile,
      userId: "user-b",
      requestedPermission: ObjectPermission.READ,
    }),
    false,
  );
});

test("public ACL permits anonymous reads but not writes", async () => {
  const objectFile = objectWithMetadata(
    JSON.stringify({ owner: "user-a", visibility: "public" }),
  );
  assert.equal(
    await canAccessObject({
      objectFile,
      requestedPermission: ObjectPermission.READ,
    }),
    true,
  );
  assert.equal(
    await canAccessObject({
      objectFile,
      requestedPermission: ObjectPermission.WRITE,
    }),
    false,
  );
});

test("malformed ACL metadata fails closed", async () => {
  const objectFile = objectWithMetadata("{not-json");
  assert.equal(await getObjectAclPolicy(objectFile), null);
  assert.equal(
    await canAccessObject({
      objectFile,
      userId: "user-a",
      requestedPermission: ObjectPermission.READ,
    }),
    false,
  );
});