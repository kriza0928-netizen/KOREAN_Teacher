"use client";

import { IosInstallGuide } from "@/components/IosInstallGuide";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";

export function PwaShell() {
  return (
    <>
      <PwaInstallPrompt />
      <IosInstallGuide />
    </>
  );
}
