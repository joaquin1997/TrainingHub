/** API-relative URL of an exercise's photo; `v` busts the client cache on change. */
export function photoImageUrl(exercisePublicId: string, updatedAt: Date) {
  return `/exercises/${exercisePublicId}/photo?v=${updatedAt.getTime()}`;
}
