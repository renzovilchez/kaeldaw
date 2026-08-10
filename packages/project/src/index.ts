// @kaeldaw/project — stores, history, serialization
export {
  deserialize,
  serialize,
  getVersion,
  SchemaValidationError,
} from "./schema";
export type { ProjectSchema, ProjectTrack, ProjectMixerChannel, ProjectClip, ProjectMidiNote } from "./schema";
export {
  saveToBlob,
  loadFromBlob,
  loadFromFile,
  KaeldawError,
} from "./kaeldaw";
export { UndoRedoManager } from "./CommandHistory";
export type { Command } from "./CommandHistory";
export { useMixerStore } from "./useMixerStore";
export type { MixerStore, MixerChannel } from "./useMixerStore";
export type { ClipData, MidiNoteData } from "./useClipsStore";
export { encodeWav, createDownloadLink, revokeDownloadLink, exportWav } from "./wav-export";
export type { ExportOptions, ExportResult } from "./wav-export";

export * from "./core";
