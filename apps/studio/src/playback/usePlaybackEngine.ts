import { useEffect } from "react";
import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";
import { Transport } from "@kaeldaw/audio-engine/Transport";
import { useClipsStore } from "@kaeldaw/project/useClipsStore";
import { useMixerStore } from "@kaeldaw/project/useMixerStore";
import { instrumentManager } from "../shared/instrumentManager";
import { buildMidiEvents } from "../shared/buildMidiEvents";

export function usePlaybackEngine(
  transportState: string,
  setMeterLevel: (id: string, level: number) => void,
  setMasterMeterLevel: (level: number) => void,
) {
  useEffect(() => {
    let cancelled = false;

    if (transportState === "playing") {
      PolySynthOutput.onLevel = (level: number) => {
        for (const ch of useMixerStore.getState().channels) {
          setMeterLevel(ch.id, level);
        }
        setMasterMeterLevel(level);
      };

      (async () => {
        try {
          await PolySynthOutput.start();
          PolySynthOutput.setConfig(instrumentManager.getSelectedConfig());
        } catch (err) {
          console.error("PolySynthOutput.start() failed:", err);
          return;
        }
        if (cancelled) return;

        const clips = useClipsStore.getState().clips;
        const events = buildMidiEvents(clips);

        PolySynthOutput.startScheduled(
          events,
          Transport.bpm,
          Transport.ppqn,
          Transport.position,
        );
      })();

      return () => {
        cancelled = true;
        PolySynthOutput.allNotesOff();
        PolySynthOutput.stop();
        for (const ch of useMixerStore.getState().channels) {
          setMeterLevel(ch.id, 0);
        }
        setMasterMeterLevel(0);
      };
    } else {
      PolySynthOutput.allNotesOff();
      PolySynthOutput.stop();
      for (const ch of useMixerStore.getState().channels) {
        setMeterLevel(ch.id, 0);
      }
      setMasterMeterLevel(0);
    }

    return () => {
      cancelled = true;
    };
  }, [transportState, setMeterLevel, setMasterMeterLevel]);
}
