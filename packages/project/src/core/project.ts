import type { ProjectSchema } from "../schema";
import { serialize, deserialize } from "../schema";
import type {
  CoreClip,
  CoreMidiNote,
  CoreMixerBus,
  CoreMixerChannel,
  CoreState,
  CoreTrack,
  TimeSignature,
} from "./types";
import { createProject as createInitialState } from "./commands";
import * as C from "./commands";
import { createCoreStore, type CoreStore, type CoreListener } from "./store";
import { toSchema, fromSchema } from "./schema-convert";

export class Project {
  private _store: CoreStore;

  constructor(initialState?: CoreState) {
    this._store = createCoreStore(initialState ?? createInitialState());
  }

  static create(): Project {
    return new Project();
  }

  static fromSchema(schema: ProjectSchema): Project {
    return new Project(fromSchema(schema));
  }

  get state(): CoreState {
    return this._store.getState();
  }

  subscribe(listener: CoreListener): () => void {
    return this._store.subscribe(listener);
  }

  // --- Project meta ---

  get name(): string {
    return this.state.name;
  }
  get bpm(): number {
    return this.state.bpm;
  }
  get timeSignature(): TimeSignature {
    return this.state.timeSignature;
  }
  get ppqn(): number {
    return this.state.ppqn;
  }

  setName(name: string): void {
    this._store.dispatch("setName", (s) => C.setName(s, name));
  }

  setTempo(bpm: number): void {
    this._store.dispatch("setTempo", (s) => C.setTempo(s, bpm));
  }

  setTimeSignature(timeSignature: TimeSignature): void {
    this._store.dispatch("setTimeSignature", (s) =>
      C.setTimeSignature(s, timeSignature),
    );
  }

  // --- Tracks ---

  get tracks(): CoreTrack[] {
    return this.state.tracks;
  }

  get selectedTrackId(): string | null {
    return this.state.meta.selectedTrackId;
  }

  addTrack(name?: string, presetId?: string, presetEngine?: string): string {
    const next = this._store.run("addTrack", (s) =>
      C.addTrack(s, name, presetId, presetEngine),
    );
    const track = next.tracks[next.tracks.length - 1];
    return track.id;
  }

  removeTrack(id: string): void {
    this._store.dispatch("removeTrack", (s) => C.removeTrack(s, id));
  }

  renameTrack(id: string, name: string): void {
    this._store.dispatch("renameTrack", (s) => C.renameTrack(s, id, name));
  }

  selectTrack(id: string | null): void {
    this._store.dispatch("selectTrack", (s) => C.selectTrack(s, id));
  }

  setTrackColor(id: string, color: string): void {
    this._store.dispatch("setTrackColor", (s) => C.setTrackColor(s, id, color));
  }

  setTrackPreset(id: string, presetId: string): void {
    this._store.dispatch("setTrackPreset", (s) => C.setTrackPreset(s, id, presetId));
  }

  setTrackEngine(id: string, engine: string, sampleId?: string): void {
    this._store.dispatch("setTrackEngine", (s) =>
      C.setTrackEngine(s, id, engine, sampleId),
    );
  }

  reorderTracks(fromIndex: number, toIndex: number): void {
    this._store.dispatch("reorderTracks", (s) =>
      C.reorderTracks(s, fromIndex, toIndex),
    );
  }

  // --- Clips ---

  get clips(): CoreClip[] {
    return this.state.clips;
  }

  addClip(
    clip: Omit<CoreClip, "id" | "notes" | "startOffset"> & {
      notes?: CoreMidiNote[];
      startOffset?: number;
    },
    externalId?: number,
  ): number {
    const next = this._store.run("addClip", (s) => C.addClip(s, clip, externalId));
    const created = next.clips[next.clips.length - 1];
    return created.id;
  }

  removeClip(id: number): void {
    this._store.dispatch("removeClip", (s) => C.removeClip(s, id));
  }

  moveClip(id: number, startTick: number, trackIndex: number, trackId?: string): void {
    this._store.dispatch("moveClip", (s) =>
      C.moveClip(s, id, startTick, trackIndex, trackId),
    );
  }

  resizeClip(id: number, startTick: number, durationTicks: number): void {
    this._store.dispatch("resizeClip", (s) =>
      C.resizeClip(s, id, startTick, durationTicks),
    );
  }

  trimClip(id: number, startOffset: number, durationTicks: number): void {
    this._store.dispatch("trimClip", (s) =>
      C.trimClip(s, id, startOffset, durationTicks),
    );
  }

  setClipNotes(clipId: number, notes: CoreMidiNote[]): void {
    this._store.dispatch("setClipNotes", (s) => C.setClipNotes(s, clipId, notes));
  }

  addNote(
    clipId: number,
    note: Omit<CoreMidiNote, "id">,
    externalId?: number,
  ): number {
    const next = this._store.run("addNote", (s) => C.addNote(s, clipId, note, externalId));
    const clip = next.clips.find((c) => c.id === clipId);
    if (!clip) return -1;
    const created = clip.notes[clip.notes.length - 1];
    return created.id;
  }

  removeNote(clipId: number, noteId: number): void {
    this._store.dispatch("removeNote", (s) => C.removeNote(s, clipId, noteId));
  }

  updateNote(
    clipId: number,
    noteId: number,
    patch: Partial<Pick<CoreMidiNote, "note" | "startTick" | "durationTicks" | "velocity">>,
  ): void {
    this._store.dispatch("updateNote", (s) =>
      C.updateNote(s, clipId, noteId, patch),
    );
  }

  // --- Mixer ---

  get mixer(): CoreState["mixer"] {
    return this.state.mixer;
  }

  get channels(): CoreMixerChannel[] {
    return this.state.mixer.channels;
  }

  get buses(): CoreMixerBus[] {
    return this.state.mixer.buses;
  }

  get masterVolume(): number {
    return this.state.mixer.masterVolume;
  }

  addChannel(channel: Partial<CoreMixerChannel> & { id: string }): void {
    this._store.dispatch("addChannel", (s) => C.addMixerChannel(s, channel));
  }

  removeChannel(id: string): void {
    this._store.dispatch("removeChannel", (s) => C.removeMixerChannel(s, id));
  }

  setChannelVolume(id: string, volume: number): void {
    this._store.dispatch("setChannelVolume", (s) => C.setChannelVolume(s, id, volume));
  }

  setChannelPan(id: string, pan: number): void {
    this._store.dispatch("setChannelPan", (s) => C.setChannelPan(s, id, pan));
  }

  setChannelMute(id: string, mute: boolean): void {
    this._store.dispatch("setChannelMute", (s) => C.setChannelMute(s, id, mute));
  }

  setChannelSolo(id: string, solo: boolean): void {
    this._store.dispatch("setChannelSolo", (s) => C.setChannelSolo(s, id, solo));
  }

  setChannelInsertFx(
    id: string,
    type: "delay" | "reverb",
    enabled: boolean,
    wet: number,
  ): void {
    this._store.dispatch("setChannelInsertFx", (s) =>
      C.setChannelInsertFx(s, id, type, enabled, wet),
    );
  }

  setChannelSend(id: string, busId: string, level: number): void {
    this._store.dispatch("setChannelSend", (s) =>
      C.setChannelSend(s, id, busId, level),
    );
  }

  addBus(bus: Partial<CoreMixerBus> & { id: string }): void {
    this._store.dispatch("addBus", (s) => C.addMixerBus(s, bus));
  }

  setBusVolume(id: string, volume: number): void {
    this._store.dispatch("setBusVolume", (s) => C.setBusVolume(s, id, volume));
  }

  setMasterVolume(volume: number): void {
    this._store.dispatch("setMasterVolume", (s) => C.setMasterVolume(s, volume));
  }

  // --- Transport (solo estado; el audio lo maneja el puente) ---

  get transport(): CoreState["transport"] {
    return this.state.transport;
  }

  play(): void {
    this._store.dispatch("play", (s) => C.play(s));
  }

  pause(): void {
    this._store.dispatch("pause", (s) => C.pause(s));
  }

  stop(): void {
    this._store.dispatch("stop", (s) => C.stop(s));
  }

  setPosition(position: number): void {
    this._store.dispatch("setPosition", (s) => C.setPosition(s, position));
  }

  toggleMetronome(): void {
    this._store.dispatch("toggleMetronome", (s) => C.toggleMetronome(s));
  }

  // --- Undo / Redo ---

  undo(): boolean {
    return this._store.undo();
  }

  redo(): boolean {
    return this._store.redo();
  }

  get canUndo(): boolean {
    return this._store.canUndo();
  }

  get canRedo(): boolean {
    return this._store.canRedo();
  }

  clearHistory(): void {
    this._store.clearHistory();
  }

  // --- Persistencia ---

  toSchema(): ProjectSchema {
    return toSchema(this.state);
  }

  fromSchema(schema: ProjectSchema): void {
    this._store.reset(fromSchema(schema));
  }

  serialize(): string {
    return serialize(this.toSchema());
  }

  deserialize(json: string): void {
    this.fromSchema(deserialize(json));
  }
}
