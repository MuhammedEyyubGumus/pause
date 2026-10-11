"use client";

import type { FlowOption } from "@/features/urge-flow/types";

import { Breathe } from "./breathe";
import { ChangePlace } from "./change-place";
import { NowLaterDelegate } from "./now-later-delegate";
import { SimpleIntervention } from "./simple-intervention";
import { UrgeSurf } from "./urge-surf";

type Props = {
  option: FlowOption;
  onFinish: (details: Record<string, unknown>) => void;
};

// Her alternatifin kendi mini deneyimi. Yeni bir deneyim eklemek için
// yalnızca buraya bir satır eklenir.
export function InterventionPlayer({ option, onFinish }: Props) {
  switch (option.key) {
    case "breathe":
      return <Breathe onFinish={onFinish} />;
    case "change_place":
      return <ChangePlace onFinish={onFinish} />;
    case "urge_surf":
      return <UrgeSurf onFinish={onFinish} />;
    case "now_later_delegate":
      return <NowLaterDelegate onFinish={onFinish} />;
    default:
      return <SimpleIntervention option={option} onFinish={() => onFinish({})} />;
  }
}
