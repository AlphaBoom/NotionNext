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

`soujirou-closeup.webp`: 420 × 420, 21,918 bytes. An AI-assisted close-up created with the built-in imagegen tool on 2026-09-08, using the owner's actual Notion avatar as the authoritative expression and design reference (Notion collection icon 7432ea2a-c53c-4196-8f9c-7d8843a65d5c). The intended expression is ご機嫌ななめ: grumpy and unreceptive to Hifumi's affection, not sleepy or self-satisfied. The lowered eyelids, round ears and large oval muzzle follow the avatar. This is a new fan illustration, not an official animation frame. The original Hifumi artwork remains unchanged. Converted to WebP quality 87 for a small optional reward-theme asset.

Final generation prompt:

```text
Use case: identity-preserve
Asset type: a high-resolution character expression close-up used as a small comic inset on a NEW GAME! anime fan blog.
Input image: the blog owner's ACTUAL Soujirou hedgehog avatar. This is the authoritative character and facial expression reference. The user explicitly rejected a previous sleepy, gentle, small-nosed hedgehog: it did not match this avatar.
Primary request: faithfully redraw and enlarge THIS SAME avatar hedgehog as a crisp square anime close-up. Keep the attitude and the distinctive original facial proportions. Frame the full face, ears, upper spiny body and forepaws, face filling most of canvas. Keep everything inside canvas with 5% padding.
CRITICAL identity and expression invariants: broad, almost round ivory face with short pointed fur edge; two big round brown ears at upper sides; reddish brown back quills; a VERY LARGE protruding pale oval muzzle occupying the LOWER THIRD of the face, with a small horizontal dark maroon oval nose low in that muzzle; tiny dark eyes deeply under thick near-horizontal, slightly slanting lowered upper lids; pupils toward the viewer with a dry, unimpressed, knowing 'really?' side-eye. Tiny two forehead marks. Maintain the reference's mildly cocky, deadpan, a little contrary 'ななめ' attitude. Small paws tucked/crossed below the face as in the reference.
The expression is not sweet, peaceful or drowsy: it has a quietly cheeky attitude. NO big shiny cute eyes, NO giant grin, NO raised happy eyebrows, NO sleepy drooping face. Do NOT shrink the large oval muzzle into a tiny button nose. Do NOT add a human mouth. Do NOT change to a generic pet hedgehog.
Style: match the actual reference's clean 2D Japanese anime cel linework and simple muted brown/ivory colors. Clear shape design, flat fills with minimal cel shading, no fur texture rendering, no realistic detail, no gradients, no 3D.
Background: a single flat warm ivory #fff7e5, no frame, no vignette, no text, no watermark. The web page provides the comic bubble frame. This is a new clear enlargement of the supplied avatar, not an unrelated character redesign.
```
