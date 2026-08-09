import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { PianoRoll } from "../PianoRoll";

beforeAll(() => {
  if (!customElements.get("daw-piano-roll")) {
    customElements.define("daw-piano-roll", PianoRoll);
  }
});

afterEach(() => {
  document.body.innerHTML = "";
});

function createPianoRoll(): PianoRoll {
  const el = document.createElement("daw-piano-roll") as PianoRoll;
  document.body.appendChild(el);
  return el;
}

const GRID_LEFT = 56;
const HEADER_OFFSET = 24;

describe("PianoRoll", () => {
  it("esta registrado como custom element", () => {
    const Ctor = customElements.get("daw-piano-roll");
    expect(Ctor).toBe(PianoRoll);
  });

  it("crea un canvas interno en connectedCallback", () => {
    const pr = createPianoRoll();
    const canvas = pr.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas!.tagName).toBe("CANVAS");
  });

  it("addNote agrega una nota y getNotes la retorna", () => {
    const pr = createPianoRoll();
    const id = pr.addNote(60, 0, 96, 100);
    const notes = pr.getNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ id, note: 60, startTick: 0, durationTicks: 96, velocity: 100 });
  });

  it("removeNote elimina la nota", () => {
    const pr = createPianoRoll();
    const id = pr.addNote(60, 0, 96);
    expect(pr.getNotes()).toHaveLength(1);
    pr.removeNote(id);
    expect(pr.getNotes()).toHaveLength(0);
  });

  it("clearNotes vacia todas las notas", () => {
    const pr = createPianoRoll();
    pr.addNote(60, 0, 96);
    pr.addNote(64, 96, 96);
    pr.clearNotes();
    expect(pr.getNotes()).toHaveLength(0);
  });

  it("selectedNoteId se setea y se lee", () => {
    const pr = createPianoRoll();
    const id = pr.addNote(60, 0, 96);
    pr.selectedNoteId = id;
    expect(pr.selectedNoteId).toBe(id);
    pr.selectedNoteId = null;
    expect(pr.selectedNoteId).toBeNull();
  });

  it("removeNote limpia selectedNoteId si el seleccionado se elimina", () => {
    const pr = createPianoRoll();
    const id = pr.addNote(60, 0, 96);
    pr.selectedNoteId = id;
    pr.removeNote(id);
    expect(pr.selectedNoteId).toBeNull();
  });

  it("playheadTick se setea y se lee", () => {
    const pr = createPianoRoll();
    pr.playheadTick = 240;
    expect(pr.playheadTick).toBe(240);
  });

  it("playheadTick no acepta negativos", () => {
    const pr = createPianoRoll();
    pr.playheadTick = -10;
    expect(pr.playheadTick).toBe(0);
  });

  it("pixelsPerBeat se clamp entre 10 y 200", () => {
    const pr = createPianoRoll();
    pr.pixelsPerBeat = 5;
    expect(pr.pixelsPerBeat).toBe(10);
    pr.pixelsPerBeat = 500;
    expect(pr.pixelsPerBeat).toBe(200);
  });

  it("zoomIn aumenta pixelsPerBeat", () => {
    const pr = createPianoRoll();
    const before = pr.pixelsPerBeat;
    pr.zoomIn();
    expect(pr.pixelsPerBeat).toBeGreaterThan(before);
  });

  it("zoomOut disminuye pixelsPerBeat", () => {
    const pr = createPianoRoll();
    pr.zoomIn();
    const before = pr.pixelsPerBeat;
    pr.zoomOut();
    expect(pr.pixelsPerBeat).toBeLessThan(before);
  });

  it("scrollToTick cambia scrollX", () => {
    const pr = createPianoRoll();
    pr.scrollToTick(480);
    expect(pr.scrollX).toBe(480);
  });

  it("snapUnit se setea y se lee", () => {
    const pr = createPianoRoll();
    expect(pr.snapUnit).toBe("1/4");
    pr.snapUnit = "1/8";
    expect(pr.snapUnit).toBe("1/8");
    pr.snapUnit = "bar";
    expect(pr.snapUnit).toBe("bar");
  });

  it("dispara note-add al hacer click en grid vacio", () => {
    const pr = createPianoRoll();
    const canvas = pr.querySelector("canvas")!;
    const handler = vi.fn();
    pr.addEventListener("note-add", handler);
    canvas.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: GRID_LEFT + 50, clientY: HEADER_OFFSET + 30 }));
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail).toHaveProperty("noteId");
    expect(detail).toHaveProperty("note");
    expect(detail).toHaveProperty("startTick");
  });

  it("mousedown sobre nota la selecciona", () => {
    const pr = createPianoRoll();
    pr.noteStart = 84;
    pr.noteEnd = 48;
    const id = pr.addNote(72, 0, 96, 100);
    const noteY = HEADER_OFFSET + (84 - 72) * 12;
    const canvas = pr.querySelector("canvas")!;
    canvas.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: GRID_LEFT + 10, clientY: noteY }));
    expect(pr.selectedNoteId).toBe(id);
  });

  it("dispara note-move al arrastrar nota", () => {
    const pr = createPianoRoll();
    pr.noteStart = 84;
    pr.noteEnd = 48;
    pr.addNote(72, 0, 96, 100);
    const noteY = HEADER_OFFSET + (84 - 72) * 12;
    const canvas = pr.querySelector("canvas")!;
    const handler = vi.fn();
    pr.addEventListener("note-move", handler);
    canvas.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: GRID_LEFT + 10, clientY: noteY }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: GRID_LEFT + 100, clientY: noteY }));
    document.dispatchEvent(new MouseEvent("mouseup"));
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail).toHaveProperty("noteId");
    expect(detail).toHaveProperty("startTick");
  });

  it("Delete remueve nota seleccionada y dispara note-delete", () => {
    const pr = createPianoRoll();
    const id = pr.addNote(60, 0, 96);
    pr.selectedNoteId = id;
    const handler = vi.fn();
    pr.addEventListener("note-delete", handler);
    pr.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete" }));
    expect(pr.getNotes()).toHaveLength(0);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.noteId).toBe(id);
  });

  it("disconnectedCallback remueve event listeners y no crashea", () => {
    const pr = createPianoRoll();
    pr.remove();
    expect(document.body.contains(pr)).toBe(false);
  });
});
