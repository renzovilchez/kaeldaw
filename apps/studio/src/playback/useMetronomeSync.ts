import { useEffect } from "react";
import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";
import { useTransportStore } from "@kaeldaw/project/useTransportStore";

export function useMetronomeSync(enabled: boolean) {
  useEffect(() => {
    PolySynthOutput.setMetronome(
      enabled,
      960,
      useTransportStore.getState().timeSignature.beats,
    );
  }, [enabled]);
}
