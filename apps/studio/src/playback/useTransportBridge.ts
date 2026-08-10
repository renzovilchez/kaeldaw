import { useEffect } from "react";
import { Transport } from "@kaeldaw/audio-engine/Transport";
import { Clock } from "@kaeldaw/audio-engine/Clock";
import { AudioContextManager } from "@kaeldaw/audio-engine/AudioContextManager";
import { project, useCore } from "../stores/useCoreStore";

export function useTransportBridge() {
  const state = useCore((s) => s.transport.state);
  const bpm = useCore((s) => s.bpm);
  const timeSignature = useCore((s) => s.timeSignature);

  useEffect(() => {
    Clock.onPosition = (tick) => {
      project.apply({
        transport: { ...project.state.transport, position: tick },
      });
    };
    return () => {
      Clock.onPosition = null;
    };
  }, []);

  useEffect(() => {
    Transport.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    Transport.setTimeSignature(timeSignature.beats, timeSignature.beatValue);
  }, [timeSignature]);

  useEffect(() => {
    if (state === "playing") {
      let cancelled = false;
      (async () => {
        AudioContextManager.init();
        await AudioContextManager.resume();
        if (cancelled) return;
        Transport.play();
        Clock.start();
      })();
      return () => {
        cancelled = true;
      };
    } else if (state === "paused") {
      Clock.stop();
      Transport.pause();
    } else {
      Clock.stop();
      Transport.stop();
    }
  }, [state]);
}
