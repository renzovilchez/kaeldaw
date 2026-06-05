import { describe, it, expect, beforeEach } from "vitest";
import { useTracksStore } from "../useTracksStore";

beforeEach(() => {
  useTracksStore.setState({ tracks: [], selectedId: null });
});

describe("useTracksStore", () => {
  it("estado inicial: tracks vacio, selectedId null", () => {
    const s = useTracksStore.getState();
    expect(s.tracks).toEqual([]);
    expect(s.selectedId).toBeNull();
  });

  it("addTrack() agrega pista con nombre default", () => {
    useTracksStore.getState().addTrack();
    const tracks = useTracksStore.getState().tracks;
    expect(tracks).toHaveLength(1);
    expect(tracks[0].name).toMatch(/^Track \d+$/);
    expect(tracks[0].id).toBeDefined();
  });

  it("addTrack('Bateria') agrega pista con nombre personalizado", () => {
    useTracksStore.getState().addTrack("Bateria");
    const tracks = useTracksStore.getState().tracks;
    expect(tracks[0].name).toBe("Bateria");
  });

  it("removeTrack(id) elimina pista", () => {
    useTracksStore.getState().addTrack("A");
    const id = useTracksStore.getState().tracks[0].id;
    useTracksStore.getState().removeTrack(id);
    expect(useTracksStore.getState().tracks).toHaveLength(0);
  });

  it("renameTrack(id, name) cambia nombre", () => {
    useTracksStore.getState().addTrack("Original");
    const id = useTracksStore.getState().tracks[0].id;
    useTracksStore.getState().renameTrack(id, "Renombrada");
    expect(useTracksStore.getState().tracks[0].name).toBe("Renombrada");
  });

  it("selectTrack(id) establece selectedId", () => {
    useTracksStore.getState().addTrack("A");
    const id = useTracksStore.getState().tracks[0].id;
    useTracksStore.getState().selectTrack(id);
    expect(useTracksStore.getState().selectedId).toBe(id);
  });

  it("removeTrack de la seleccionada deselecciona", () => {
    useTracksStore.getState().addTrack("A");
    const id = useTracksStore.getState().tracks[0].id;
    useTracksStore.getState().selectTrack(id);
    useTracksStore.getState().removeTrack(id);
    expect(useTracksStore.getState().selectedId).toBeNull();
  });

  it("reorderTracks mueve pista a nueva posicion", () => {
    useTracksStore.getState().addTrack("A");
    useTracksStore.getState().addTrack("B");
    useTracksStore.getState().addTrack("C");
    useTracksStore.getState().reorderTracks(0, 2);
    const tracks = useTracksStore.getState().tracks;
    expect(tracks[0].name).toBe("B");
    expect(tracks[1].name).toBe("C");
    expect(tracks[2].name).toBe("A");
  });

  it("clearTracks vacia la lista y deselecciona", () => {
    useTracksStore.getState().addTrack("A");
    useTracksStore.getState().addTrack("B");
    const idA = useTracksStore.getState().tracks[0].id;
    useTracksStore.getState().selectTrack(idA);
    useTracksStore.getState().clearTracks();
    const s = useTracksStore.getState();
    expect(s.tracks).toEqual([]);
    expect(s.selectedId).toBeNull();
  });
});
