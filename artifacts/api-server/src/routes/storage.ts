import { Readable } from 'stream';
import {
  FinalizeUploadBody,
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from '@workspace/api-zod';
import { Router, type IRouter, type Request, type Response } from 'express';

import { requireAuth } from '../middlewares/requireAuth';
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';
import {
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
} from '../lib/objectAcl';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db, objectUploadsTable } from '@workspace/db';
import { BusinessAccessDeniedError, requireOwner } from '../services/businessAccessService';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

async function streamObject(
  req: Request,
  res: Response,
  objectFile: Awaited<ReturnType<ObjectStorageService['getObjectEntityFile']>>,
) {
  const response = await objectStorageService.downloadObject(objectFile);
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (response.body) {
    Readable.fromWeb(
      response.body as ReadableStream<Uint8Array>,
    ).pipe(res);
  } else {
    res.end();
  }
}

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 * Protected by Clerk session auth (requireAuth) so public callers cannot mint
 * write-capable URLs.
 */
router.post(
  '/storage/uploads/request-url',
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }

    try {
      await requireOwner(req.appUser!);
      const { name, size, contentType } = parsed.data;

      // Generic uploads are deliberately small. Larger social media files use
      // the dedicated constrained social-media upload URL instead.
      const MAX_UPLOAD_BYTES = 24 * 1024;
      if (size > MAX_UPLOAD_BYTES) {
        res.status(400).json({
          error: `File too large: uploads are limited to ${MAX_UPLOAD_BYTES / 1024} KB`,
        });
        return;
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);
      await db.insert(objectUploadsTable).values({
        objectPath,
        ownerClerkUserId: req.appUser!.clerkUserId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      if (error instanceof BusinessAccessDeniedError) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      req.log.error({ err: error }, 'Error generating upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },
);

/**
 * POST /storage/uploads/finalize
 *
 * A presigned PUT cannot safely carry application ownership metadata. This
 * authenticated step binds the uploaded object to the requesting Clerk user
 * and writes the ACL only after the object exists.
 */
router.post(
  '/storage/uploads/finalize',
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = FinalizeUploadBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid upload details' });
      return;
    }

    const [pending] = await db
      .select()
      .from(objectUploadsTable)
      .where(
        and(
          eq(objectUploadsTable.objectPath, parsed.data.objectPath),
          isNull(objectUploadsTable.finalizedAt),
          gt(objectUploadsTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!pending || pending.ownerClerkUserId !== req.appUser!.clerkUserId) {
      res.status(403).json({ error: 'Upload is not available.' });
      return;
    }

    try {
      await requireOwner(req.appUser!);
      await objectStorageService.trySetObjectEntityAclPolicy(
        pending.objectPath,
        {
          owner: req.appUser!.clerkUserId,
          visibility: parsed.data.visibility,
        },
      );
      await db
        .update(objectUploadsTable)
        .set({ finalizedAt: new Date() })
        .where(eq(objectUploadsTable.id, pending.id));
      res.json({ objectPath: pending.objectPath });
    } catch (error) {
      if (error instanceof BusinessAccessDeniedError) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: 'Uploaded object not found.' });
        return;
      }
      req.log.error({ err: error }, 'Error finalizing object upload');
      res.status(500).json({ error: 'Failed to finalize upload' });
    }
  },
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      req.log.error({ err: error }, 'Error serving public object');
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

/**
 * Serve explicitly public assets that are stored in the private
 * bucket. This route checks the object ACL without a user and never exposes
 * private objects merely because a path is known.
 */
router.get(
  '/storage/public-assets/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const objectFile = await objectStorageService.getObjectEntityFile(
        `/objects/${filePath}`,
      );
      const aclPolicy = await getObjectAclPolicy(objectFile);
      const allowed = aclPolicy
        ? await canAccessObject({
            objectFile,
            requestedPermission: ObjectPermission.READ,
          })
        : false;
      if (!allowed) {
        res.status(404).json({ error: 'File not found' });
        return;
      }
      await streamObject(req, res, objectFile);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: 'File not found' });
        return;
      }
      req.log.error({ err: error }, 'Error serving public asset');
      res.status(500).json({ error: 'Failed to serve public asset' });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get('/storage/objects/*path', requireAuth, async (req: Request, res: Response) => {
  try {
    await requireOwner(req.appUser!);
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile =
      await objectStorageService.getObjectEntityFile(objectPath);

    const aclPolicy = await getObjectAclPolicy(objectFile);
    const canAccess = aclPolicy
      ? await objectStorageService.canAccessObjectEntity({
          userId: req.appUser!.clerkUserId,
          objectFile,
          requestedPermission: ObjectPermission.READ,
        })
       : false;
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    await streamObject(req, res, objectFile);
  } catch (error) {
    if (error instanceof BusinessAccessDeniedError) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, 'Object not found');
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    req.log.error({ err: error }, 'Error serving object');
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

export default router;
