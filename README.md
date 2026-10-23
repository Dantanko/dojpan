# DOJ Panache site

Plain HTML, CSS and JS. No build step. Upload the folder to any static host (GitHub Pages, Netlify, Vercel).

## Images (WebP, put in /images)
- hero.webp: hero background, about 1600px wide, under 200 KB
- bridal-1.webp to bridal-6.webp, asoebi-1..6, casual-1..6, occasion-1..6: about 600x800, 60-90 KB each

Missing files are skipped, so add them gradually. The photos are shown at their own shape (no cropping). For each album, list the sizes in the grid's data-dims in index.html, for example data-dims="600x800,600x900", one entry per photo in order. The asoebi album already has its 10 photos set up.

## More views of one outfit (quick view)
Tapping an outfit opens a quick view. To give an outfit more angles, add files named like asoebi-3-2.webp, asoebi-3-3.webp (outfit 3, views 2 and 3), then list how many views each outfit has in the grid, for example data-views="1,1,3,1,..." in the same order as data-dims. Thumbnails and the "Ask about this outfit" WhatsApp button appear automatically.

## Instagram reels
Reels play on the site straight from Instagram, so there is nothing to upload. In index.html, inside the "On Instagram" section, add one line per reel:
<button class="reel" data-url="https://www.instagram.com/reel/XXXX/">Watch reel</button>
Use the reel's link from Instagram (Share, Copy link). The account must be public. Nothing loads until a visitor taps a reel.

## Viewing photos
Tapping an album photo opens it large. Arrow keys, swiping and Esc work.

## To edit
- Words, phone numbers, address: index.html
- Colours, fonts, spacing: css/style.css (colour variables are at the top)
- Albums, photo viewer, reels, scroll effects: js/main.js
- Logo: images/logo.svg (dark), logo-white.svg (for dark backgrounds), favicon.svg (browser tab). The header logo is inline in index.html.
- Still to fill in: her website address in the business details block in index.html.

## Latest photos
The five photos under "Bespoke wears for any occasion" pick themselves: they are the newest outfits (highest numbers), taken in turn from each album that has photos. Add new photos at the end of an album and update its data-dims, and this row updates on its own. Tapping one opens its quick view.

## Hero background
Optional: add images/hero.webp (about 1600px wide, under 200 KB, a dark or calm photo works best) and it appears behind the headline. Until then the hero shows a dark brown fabric-stripe background.
