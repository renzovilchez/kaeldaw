import { useEffect } from "react";
import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";
import { Transport } from "@kaeldaw/audio-engine/Transport";
import { Clock } from "@kaeldaw/audio-engine/Clock";
import { instrumentManager } from "../shared/instrumentManager";
import { buildMidiEvents } from "../shared/buildMidiEvents";
import { project, useCore } from "../stores/useCoreStore";

export function usePlaybackEngine(
  setMeterLevel: (id: string, level: number) => void,
  setMasterMeterLevel: (level: number) => void,
) {
  const transportState = useCore((s) => s.transport.state);

  useEffect(() => {
    let cancelled = false;

    if (transportState === "playing") {
      PolySynthOutput.onLevel = (level: number) => {
        for (const ch of project.state.mixer.channels) {
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

        const clips = project.state.clips;
        const events = buildMidiEvents(clips);

        PolySynthOutput.startScheduled(
          events,
          Transport.bpm,
          Transport.ppqn,
          Transport.position,
        );
        Transport.play();
        Clock.start();
      })();

      return () => {
        cancelled = true;
        PolySynthOutput.allNotesOff();
        PolySynthOutput.stop();
        for (const ch of project.state.mixer.channels) {
          setMeterLevel(ch.id, 0);
        }
        setMasterMeterLevel(0);
      };
    } else {
      PolySynthOutput.allNotesOff();
      PolySynthOutput.stop();
      for (const ch of project.state.mixer.channels) {
        setMeterLevel(ch.id, 0);
      }
      setMasterMeterLevel(0);
    }

    return () => {
      cancelled = true;
    };
  }, [transportState, setMeterLevel, setMasterMeterLevel]);
}
