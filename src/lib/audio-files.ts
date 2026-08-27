export const AUDIO_ACCEPT =
  "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/m4a,audio/aac,audio/ogg,audio/webm,video/mp4,.mp3,.wav,.m4a,.mp4,.ogg,.webm,.aac";

export const ZIP_ACCEPT = ".zip,application/zip,application/x-zip-compressed";
export const FILE_ACCEPT = `${AUDIO_ACCEPT},${ZIP_ACCEPT}`;

export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
export const MAX_ZIP_BYTES = 500 * 1024 * 1024;
export const MAX_BATCH_FILES = 100;

const AUDIO_EXT = /\.(mp3|wav|m4a|mp4|ogg|webm|aac)$/i;
const ZIP_EXT = /\.zip$/i;
const ARCHIVE_EXT = /\.(zip|rar|7z|tar|gz|tgz)$/i;
const SKIP_NAME = /(^__macosx$|^\.ds_store$|^thumbs\.db$|^\._)/i;

const AUDIO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  mp4: "video/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  webm: "audio/webm",
};

export type AudioPick = {
  file: File;
  key: string;
  label: string;
  relativePath: string;
};

function fileKey(file: File, relativePath: string) {
  return `${relativePath}::${file.size}::${file.lastModified}`;
}

export function displayName(file: File) {
  const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath || "";
  return relative || file.name;
}

export function isAudioFile(file: File) {
  if (SKIP_NAME.test(file.name) || file.name.startsWith(".")) return false;
  if (AUDIO_EXT.test(file.name)) return true;
  return file.type.startsWith("audio/") || file.type === "video/mp4";
}

export function isZipFile(file: File) {
  return (
    ZIP_EXT.test(file.name) ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed" ||
    file.type === "application/x-zip"
  );
}

function mimeForAudioName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return AUDIO_MIME[ext] || "audio/mpeg";
}

function zipFolderLabel(zipName: string) {
  return zipName.replace(/\.zip$/i, "") || "archive";
}

export function toAudioPick(file: File): AudioPick | null {
  if (!isAudioFile(file)) return null;
  const relativePath = displayName(file);
  return {
    file,
    key: fileKey(file, relativePath),
    label: file.name,
    relativePath,
  };
}

export function mergeAudioPicks(current: AudioPick[], incoming: File[]) {
  const map = new Map(current.map((row) => [row.key, row]));
  const skipped: string[] = [];
  for (const file of incoming) {
    const pick = toAudioPick(file);
    if (!pick) {
      if (file.name && !SKIP_NAME.test(file.name) && !file.name.startsWith(".")) {
        skipped.push(file.name);
      }
      continue;
    }
    if (pick.file.size > MAX_AUDIO_BYTES) {
      skipped.push(`${pick.label} (over 100MB)`);
      continue;
    }
    map.set(pick.key, pick);
  }
  const files = [...map.values()].sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath, undefined, { numeric: true }),
  );
  if (files.length > MAX_BATCH_FILES) {
    return {
      files: files.slice(0, MAX_BATCH_FILES),
      skipped: [...skipped, `Only the first ${MAX_BATCH_FILES} recordings were kept.`],
    };
  }
  return { files, skipped };
}

async function readAllDirectoryEntries(dir: FileSystemDirectoryEntry) {
  const reader = dir.createReader();
  const entries: FileSystemEntry[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (!batch.length) break;
    entries.push(...batch);
  }
  return entries;
}

function withRelativePath(file: File, relativePath: string) {
  if ((file as File & { webkitRelativePath?: string }).webkitRelativePath) return file;
  try {
    Object.defineProperty(file, "webkitRelativePath", { value: relativePath.replace(/^\//, "") });
  } catch {
    // Some browsers freeze File objects.
  }
  return file;
}

async function walkEntry(entry: FileSystemEntry): Promise<File[]> {
  if (SKIP_NAME.test(entry.name)) return [];
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(resolve, reject);
    });
    return [withRelativePath(file, entry.fullPath || file.name)];
  }
  if (entry.isDirectory) {
    const children = await readAllDirectoryEntries(entry as FileSystemDirectoryEntry);
    const nested = await Promise.all(children.map(walkEntry));
    return nested.flat();
  }
  return [];
}

export async function filesFromDataTransfer(data: DataTransfer) {
  const items = [...data.items];
  const collected: File[] = [];
  const walked = await Promise.all(
    items.map(async (item) => {
      const entry = item.webkitGetAsEntry?.();
      if (entry) return walkEntry(entry);
      if (item.kind === "file") {
        const file = item.getAsFile();
        return file ? [file] : [];
      }
      return [];
    }),
  );
  collected.push(...walked.flat());
  if (!collected.length) collected.push(...data.files);
  return collected;
}

export async function extractAudioFromZip(
  zipFile: File,
  options?: { depth?: number; prefix?: string },
): Promise<{ files: File[]; skipped: string[] }> {
  const depth = options?.depth ?? 0;
  const prefix = options?.prefix ?? zipFolderLabel(zipFile.name);
  if (zipFile.size > MAX_ZIP_BYTES) {
    return { files: [], skipped: [`${zipFile.name} (ZIP over 500MB)`] };
  }
  if (depth > 2) {
    return { files: [], skipped: [`${zipFile.name} (nested ZIP too deep)`] };
  }

  let zip;
  try {
    const JSZip = (await import("jszip")).default;
    zip = await JSZip.loadAsync(await zipFile.arrayBuffer());
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/encrypt|password/i.test(message)) {
      return { files: [], skipped: [`${zipFile.name} (password-protected ZIP is not supported)`] };
    }
    return { files: [], skipped: [`${zipFile.name} (could not open ZIP)`] };
  }

  const files: File[] = [];
  const skipped: string[] = [];
  const entries = Object.values(zip.files);
  for (const entry of entries) {
    if (entry.dir) continue;
    const base = entry.name.split("/").filter(Boolean).pop() || entry.name;
    if (SKIP_NAME.test(base) || base.startsWith(".")) continue;
    const relative = `${prefix}/${entry.name}`.replace(/\\/g, "/").replace(/\/+/g, "/");

    if (ZIP_EXT.test(base)) {
      const blob = await entry.async("blob");
      const nested = new File([blob], base, { type: "application/zip" });
      const inner = await extractAudioFromZip(nested, {
        depth: depth + 1,
        prefix: relative.replace(/\.zip$/i, ""),
      });
      files.push(...inner.files);
      skipped.push(...inner.skipped);
      continue;
    }

    if (!AUDIO_EXT.test(base)) continue;
    const blob = await entry.async("blob");
    if (blob.size > MAX_AUDIO_BYTES) {
      skipped.push(`${base} (over 100MB)`);
      continue;
    }
    const file = new File([blob], base, {
      type: mimeForAudioName(base),
      lastModified: entry.date instanceof Date ? entry.date.getTime() : Date.now(),
    });
    files.push(withRelativePath(file, relative));
  }

  return { files, skipped };
}

export async function expandIncomingFiles(incoming: File[]) {
  const files: File[] = [];
  const skipped: string[] = [];
  for (const file of incoming) {
    if (isZipFile(file)) {
      const extracted = await extractAudioFromZip(file);
      files.push(...extracted.files);
      skipped.push(...extracted.skipped);
      if (!extracted.files.length && !extracted.skipped.length) {
        skipped.push(`${file.name} (no audio recordings inside)`);
      }
      continue;
    }
    if (ARCHIVE_EXT.test(file.name) && !ZIP_EXT.test(file.name)) {
      skipped.push(`${file.name} (use a .zip archive)`);
      continue;
    }
    files.push(file);
  }
  return { files, skipped };
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
