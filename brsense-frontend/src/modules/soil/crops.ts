import catalog from './crops-fao56.json';
import type { CropProfile } from './types.ts';

export const CROP_PROFILES: CropProfile[] = catalog.crops.flatMap((crop) =>
  crop.referenceProfiles.map((profile) => ({
    cropId: crop.id,
    profileId: profile.id,
    name: crop.name,
    label: profile.label,
    pAtEtc5: profile.depletionFractionAtETc5MmPerDay,
  })),
);

export const SOYBEAN = CROP_PROFILES.find((profile) => profile.profileId === 'soybean')!;
