# NEW GAME! reward theme assets

The official site is a reference for the authentic character designs and wordmark only. This is an independent, expressive personal-blog reward theme: lilac / pink scenery, Hifumi gently holding Soujirou, handwritten-style decorations, floating game props and oversized type. It does not reproduce the official site layout. The blog layout and CSS are original implementations.

Sources inspected on 2026-09-08:

- Official site: https://newgame-anime.com/
- Character page: https://newgame-anime.com/character/
- `hifumi-soujirou.webp`: https://neoapo.com/images/character/30912/6da0b3520aee01773f93260eab6761a1.png (386 × 420 transparent character artwork, converted to WebP at quality 92, 34,290 bytes). Source page: https://neoapo.com/characters/30912. The complete figure is rendered with contain sizing, including the hedgehog in her hands; no character-sheet crop or empty photo frame.
- `hifumi-icon.webp`: https://newgame-anime.com/assets/character/th-c4.png (192 × 192, converted to WebP at quality 88).
- `logo-official.png`: https://newgame-anime.com/images/s2/common_logo.png (300 × 62, unchanged).

Characters and marks: © 得能正太郎・芳文社／NEW GAME!製作委員会・NEW GAME!!製作委員会. These are third-party artwork, not covered by the repository's MIT license. This is an unofficial personal blog theme; asset provenance is recorded here. The standalone UI attribution footer was removed at the owner’s request. The earlier AI fan illustration has been removed.

All assets are served locally. They are referenced only by the optional reward module, which loads after a win, the explicit console shortcut, or restoration of an existing unlock. Ordinary first visits do not download them.

## Soujirou expression inset

`soujirou-closeup.webp`: 420 × 420, 18,694 bytes. An AI-assisted close-up edited with the built-in imagegen tool on 2026-09-08. The authoritative pose/style reference was the hand region of `hifumi-soujirou.webp`; the expression reference was the previously approved avatar-based inset from commit `16cd8066`. Soujirou lies belly-down across the cupped palms, with a low brown back extending left, his broad ivory face and low oval muzzle at right, and two small forepaws resting above the near hand. The curled avatar's upright chest and pink crossed belly-like mark have been removed. His half-closed, unreceptive ご機嫌ななめ expression remains.

The owner approved this prone hedgehog. A final hands-only edit retained the approved animal and refined the two human hands, their finger joints, occlusion and cupped support. This is a fan illustration, not an official animation frame. The original full character artwork remains unchanged.

Converted to WebP quality 87. The optional theme presents it in a rounded rectangular detail panel, with a solid connector to a locator around the hedgehog in her hands. The full artwork, locator and inset share one aspect-ratio scene so resizing and animation do not separate them. There are no thought-bubble dots or visible caption labels.

Both exact image-edit prompts (prone pose, then human hands only) are recorded in [soujirou-pose-prompt.txt](soujirou-pose-prompt.txt).
