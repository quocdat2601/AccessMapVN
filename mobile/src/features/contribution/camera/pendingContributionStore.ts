import { CapturedContributionMedia } from './types';

let pendingMedia: CapturedContributionMedia | null = null;

export function setPendingContributionMedia(media: CapturedContributionMedia) {
  pendingMedia = media;
}

export function getPendingContributionMedia() {
  return pendingMedia;
}

export function clearPendingContributionMedia() {
  pendingMedia = null;
}
