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
export { useTransportStore } from "./useTransportStore";
export type { TransportStore } from "./useTransportStore";
export { useTracksStore } from "./useTracksStore";
export type { TracksStore } from "./useTracksStore";
export type { LoadResult } from "./kaeldaw";
export { useMixerStore } from "./useMixerStore";
export type { MixerStore, MixerChannel } from "./useMixerStore";
export { useProjectStore } from "./useProjectStore";
export type { ProjectStore } from "./useProjectStore";
export { useClipsStore } from "./useClipsStore";
export type { ClipsStore, ClipData } from "./useClipsStore";
export { useMidiStore } from "./useMidiStore";
export type { MidiStore, MidiNoteData } from "./useMidiStore";
export { buildProjectSchema, loadProjectSchema, saveProjectFile, loadProjectFile } from "./save-load";
export { useUndoStore } from "./useUndoStore";
export type { UndoStore } from "./useUndoStore";
export { encodeWav, createDownloadLink, revokeDownloadLink, exportWav } from "./wav-export";
export type { ExportOptions, ExportResult } from "./wav-export";
