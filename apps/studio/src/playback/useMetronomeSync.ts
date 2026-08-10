import { useEffect } from "react";
import { PolySynthOutput } from "@kaeldaw/instruments/PolySynthOutput";
import { project } from "../stores/useCoreStore";

export function useMetronomeSync(enabled: boolean) {
  useEffect(() => {
    PolySynthOutput.setMetronome(
      enabled,
      960,
      project.state.timeSignature.beats,
    );
  }, [enabled]);
}
