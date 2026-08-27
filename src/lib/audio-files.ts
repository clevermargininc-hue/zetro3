export const AUDIO_ACCEPT =
  "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/m4a,audio/aac,audio/ogg,audio/webm,video/mp4,.mp3,.wav,.m4a,.mp4,.ogg,.webm,.aac";

export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
export const MAX_BATCH_FILES = 50;

const AUDIO_EXT = /\.(mp3|wav|m4a|mp4|ogg|webm|aac)$/i;
const SKIP_NAME = /(^__macosx$|^\.ds_store$|^thumbs\.db$|^\._)/i;

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

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
