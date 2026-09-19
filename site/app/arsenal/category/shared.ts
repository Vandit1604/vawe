// The one thing page.tsx and opengraph-image.tsx both need: the category-name-to-slug rule. A
// page.tsx file can only export the fields Next's Page contract allows, so this couldn't live there.
export const slug = (category: string) => category.toLowerCase();
